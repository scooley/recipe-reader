import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf
import worker


class ConverterTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "source.pdf"
        self.output = self.root / "output"

    def save(self, document, **options):
        self.source.write_bytes(document.tobytes(**options))
        document.close()

    def simple_document(self):
        document = pymupdf.open()
        page = document.new_page()
        page.insert_text(
            (50, 80), "Synthetic instructions: work twelve rows, then measure ten cm."
        )
        return document

    def evidence(self, number):
        return json.loads((self.output / "pages" / f"{number}.json").read_bytes())

    def test_heuristic_columns_sizes_units_links_and_composite_page(self):
        document = pymupdf.open()
        page = document.new_page(width=612, height=792)
        left = (
            "Back instructions begin here.\n"
            "Sizes 1 2 3 4 5 6 7 8.\n"
            "Work 12 (14, 16, 18, 20, 22, 24, 26).\n"
            "Measure 10 cm before continuing.\n"
            "Front-left shoulder begins here.\n"
            "Continue to the next column."
        )
        right = (
            "Continue the left shoulder here.\n"
            "Work two more rows, then stop.\n"
            "Front-right shoulder begins here.\n"
            "Follow the size order from the Back.\n"
            "Imperial measurements: 4 inches."
        )
        self.assertGreater(
            page.insert_textbox(pymupdf.Rect(40, 50, 290, 230), left, fontsize=11), 0
        )
        self.assertGreater(
            page.insert_textbox(pymupdf.Rect(330, 50, 580, 230), right, fontsize=11), 0
        )
        photo = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 50, 50), False)
        photo.clear_with(180)
        page.insert_image(pymupdf.Rect(100, 250, 250, 400), pixmap=photo)
        page.draw_line((130, 270), (220, 270), color=(1, 0, 0), width=3)
        page.insert_text((230, 270), "a", fontsize=12)
        page.insert_text((50, 600), "Glossary")
        page.insert_link(
            {
                "kind": pymupdf.LINK_URI,
                "from": pymupdf.Rect(50, 585, 150, 605),
                "uri": "https://example.org/glossary",
            }
        )
        page.insert_link(
            {
                "kind": pymupdf.LINK_URI,
                "from": pymupdf.Rect(170, 585, 220, 605),
                "uri": "https://synthetic:synthetic@example.org/private",
            }
        )
        document.new_page().draw_circle((150, 150), 60, color=(0, 0, 1))
        self.save(document)

        manifest = worker.convert(self.source, self.output)
        first = self.evidence(1)
        markdown = first["markdown"]
        markers = [
            "Back instructions",
            "Front-left shoulder",
            "Continue the left shoulder",
            "Front-right shoulder",
        ]
        positions = [markdown.index(marker) for marker in markers]
        self.assertEqual(positions, sorted(positions))
        for expected in [
            "1 2 3 4 5 6 7 8",
            "12 (14, 16, 18, 20, 22, 24, 26)",
            "10 cm",
            "4 inches",
        ]:
            self.assertIn(expected, markdown)
        self.assertTrue(
            any(
                link["destination"] == "https://example.org/glossary"
                for link in first["links"]
            )
        )
        self.assertTrue(
            any(
                link["destination"] is None and link["issue"] for link in first["links"]
            )
        )
        self.assertEqual(self.evidence(2)["textStatus"], "visual-only")
        self.assertNotEqual(
            manifest["source"]["sha256"], manifest["pages"][0]["extraction"]["sha256"]
        )
        image = pymupdf.Pixmap(str(self.output / "pages/1.png"))
        self.assertEqual(
            (image.width, image.height),
            (
                manifest["pages"][0]["image"]["width"],
                manifest["pages"][0]["image"]["height"],
            ),
        )
        red, green, blue = image.pixel(round(170 * 150 / 72), round(270 * 150 / 72))
        self.assertGreater(red, 200)
        self.assertLess(max(green, blue), 60)
        self.assertTrue(
            all(
                path.name in ("manifest.json", "pages")
                for path in self.output.iterdir()
            )
        )
        for page in manifest["pages"]:
            for key in ("extraction", "image"):
                content = (self.output / page[key]["path"]).read_bytes()
                self.assertEqual(worker.digest(content), page[key]["sha256"])
                self.assertEqual(len(content), page[key]["size"])

    def test_text_only_input_is_repeatable_without_ocr_or_layout_models(self):
        self.save(self.simple_document())
        with (
            patch(
                "pymupdf4llm.use_layout", wraps=__import__("pymupdf4llm").use_layout
            ) as layout,
            patch(
                "pymupdf4llm._layout_to_markdown",
                side_effect=AssertionError("Layout models must stay disabled"),
            ),
            patch.object(
                pymupdf.Page,
                "get_textpage_ocr",
                side_effect=AssertionError("OCR must stay disabled"),
            ),
        ):
            first = worker.convert(self.source, self.output)
            layout.assert_called_once_with(False)
        second_path = self.root / "second"
        second = worker.convert(self.source, second_path)
        self.assertEqual(first, second)
        self.assertEqual(
            (self.output / "pages/1.json").read_bytes(),
            (second_path / "pages/1.json").read_bytes(),
        )

    def test_invalid_and_encrypted_documents_are_typed_and_not_published(self):
        self.source.write_bytes(b"%PDF-1.7\nnot a document")
        with self.assertRaisesRegex(worker.ConversionError, "invalid_pdf"):
            worker.convert(self.source, self.output)
        self.save(
            self.simple_document(),
            encryption=pymupdf.PDF_ENCRYPT_AES_256,
            owner_pw="synthetic",
            user_pw="synthetic",
        )
        with self.assertRaisesRegex(worker.ConversionError, "encrypted_pdf"):
            worker.convert(self.source, self.output)
        self.assertFalse((self.output / "manifest.json").exists())

    def test_image_only_scan_is_not_mislabeled_as_readable_instructions(self):
        document = pymupdf.open()
        page = document.new_page()
        pixels = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 10, 10), False)
        pixels.clear_with(180)
        page.insert_image(page.rect, pixmap=pixels)
        self.save(document)
        with self.assertRaisesRegex(worker.ConversionError, "unsupported_scan"):
            worker.convert(self.source, self.output)
        self.assertFalse((self.output / "manifest.json").exists())

    def test_page_text_and_artifact_limits_are_explicit(self):
        document = pymupdf.open()
        for _ in range(61):
            document.new_page()
        self.save(document)
        with self.assertRaisesRegex(worker.ConversionError, "page_limit"):
            worker.convert(self.source, self.output)
        self.save(self.simple_document())
        with (
            patch.object(worker, "MAX_CHARACTERS", 20),
            self.assertRaisesRegex(worker.ConversionError, "text_limit"),
        ):
            worker.convert(self.source, self.output)
        with (
            patch.object(worker, "MAX_PAGE_BYTES", 100),
            self.assertRaisesRegex(worker.ConversionError, "artifact_limit"),
        ):
            worker.convert(self.source, self.root / "limited")
        self.assertFalse((self.output / "manifest.json").exists())

    def test_resolution_reduces_full_pages_without_clipping_and_rejects_unusable_scale(
        self,
    ):
        scale, pixels = worker.rendering_plan([(595, 842)] * 60)
        self.assertGreaterEqual(scale * 72, worker.MIN_DPI)
        self.assertLess(scale * 72, worker.TARGET_DPI)
        self.assertLessEqual(sum(w * h for w, h in pixels), worker.MAX_TOTAL_PIXELS)
        self.assertTrue(all(w * h <= worker.MAX_PAGE_PIXELS for w, h in pixels))
        self.assertAlmostEqual(pixels[0][0] / pixels[0][1], 595 / 842, places=2)
        with self.assertRaisesRegex(worker.ConversionError, "evidence_limit"):
            worker.rendering_plan([(14_400, 14_400)])
        for dimensions in [[(0, 1)], [(float("nan"), 1)], [(float("inf"), 1)]]:
            with self.assertRaises(worker.ConversionError):
                worker.rendering_plan(dimensions)

    def test_input_symlink_and_existing_output_are_not_reused(self):
        self.save(self.simple_document())
        link = self.root / "link.pdf"
        link.symlink_to(self.source)
        with self.assertRaisesRegex(worker.ConversionError, "invalid_pdf"):
            worker.convert(link, self.output)
        worker.convert(self.source, self.output)
        with self.assertRaises(FileExistsError):
            worker.convert(self.source, self.output)

    def test_supervisor_kills_and_reaps_timed_out_worker(self):
        class Process:
            exitcode = None

            def __init__(self):
                self.calls = []
                self.killed = False

            def start(self):
                self.calls.append("start")

            def join(self, seconds):
                self.calls.append(("join", seconds))

            def is_alive(self):
                return not self.killed

            def kill(self):
                self.calls.append("kill")
                self.killed = True

        process = Process()
        self.assertEqual(worker.supervise(process), "timeout")
        self.assertEqual(process.calls, ["start", ("join", 25), "kill", ("join", 1)])
        with patch.object(process, "is_alive", return_value=True):
            self.assertEqual(worker.supervise(process), "termination_uncertain")

    def test_short_generic_text_does_not_require_pattern_vocabulary_or_minimum_length(
        self,
    ):
        document = pymupdf.open()
        document.new_page().insert_text((50, 80), "Mix.")
        self.save(document)
        worker.convert(self.source, self.output)
        self.assertIn("Mix.", self.evidence(1)["markdown"])

    def test_rotated_line_anchors_match_rendered_page_coordinates(self):
        document = self.simple_document()
        document[0].set_rotation(90)
        self.save(document)
        manifest = worker.convert(self.source, self.output)
        line = self.evidence(1)["lines"][0]
        self.assertGreater(line["bbox"][0], 700)
        self.assertAlmostEqual(line["bbox"][1], 50, places=1)
        self.assertLessEqual(line["bbox"][2], manifest["pages"][0]["widthPoints"])


if __name__ == "__main__":
    unittest.main()
