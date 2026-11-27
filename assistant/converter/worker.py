import hashlib
import json
import math
import multiprocessing
import os
import stat
import sys
from pathlib import Path

INPUT = Path("/work/input/source.pdf")
OUTPUT = Path("/work/output")
MAX_INPUT = 25 * 1024 * 1024
MAX_PAGE_BYTES = 8 * 1024 * 1024
MAX_ARTIFACTS = 128 * 1024 * 1024
MAX_CHARACTERS = 100_000
MAX_PAGES = 60
MAX_PAGE_PIXELS = 4_000_000
MAX_TOTAL_PIXELS = 120_000_000
MAX_DIMENSION = 16_384
TARGET_DPI = 150
MIN_DPI = 96
WALL_SECONDS = 25
MEMORY_BYTES = 512 * 1024 * 1024
ERRORS = {
    "invalid_pdf": 10,
    "encrypted_pdf": 11,
    "unsupported_scan": 12,
    "page_limit": 13,
    "text_limit": 14,
    "evidence_limit": 15,
    "artifact_limit": 16,
    "conversion_failed": 17,
    "resource_limit": 18,
    "unsupported_platform": 19,
}


class ConversionError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class _DiscardMessages:
    def write(self, text):
        return len(text)

    def flush(self):
        pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode_json(value):
    return json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")


def characters(text):
    return len(text.encode("utf-16-le")) // 2


def rendering_plan(dimensions):
    if not dimensions or any(
        not math.isfinite(w * h) or w <= 0 or h <= 0 for w, h in dimensions
    ):
        raise ConversionError("evidence_limit")
    area = sum(w * h for w, h in dimensions)
    scale = min(
        TARGET_DPI / 72,
        math.sqrt(MAX_TOTAL_PIXELS / area),
        *(math.sqrt(MAX_PAGE_PIXELS / (w * h)) for w, h in dimensions),
    )
    while True:
        pixels = [(math.ceil(w * scale), math.ceil(h * scale)) for w, h in dimensions]
        if (
            all(w * h <= MAX_PAGE_PIXELS for w, h in pixels)
            and sum(w * h for w, h in pixels) <= MAX_TOTAL_PIXELS
        ):
            break
        scale *= 0.999
    if scale * 72 < MIN_DPI or any(max(w, h) > MAX_DIMENSION for w, h in pixels):
        raise ConversionError("evidence_limit")
    return scale, pixels


def inert_link(uri):
    from urllib.parse import urlsplit

    if (
        not isinstance(uri, str)
        or characters(uri) > 2048
        or any(ord(char) <= 32 or char.isspace() or char == "\ufeff" for char in uri)
        or "\\" in uri
    ):
        return None
    try:
        parsed = urlsplit(uri)
        if (
            parsed.scheme not in ("http", "https")
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
        ):
            return None
        if parsed.port is not None and parsed.port < 1:
            return None
        return uri
    except ValueError:
        return None


def page_evidence(page, page_number, page_count, markdown, pymupdf):
    raw_lines = []
    for block in page.get_text(
        "dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES
    )["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"])
            if text:
                raw_lines.append(
                    {
                        "id": f"p{page_number}-l{len(raw_lines) + 1}",
                        "text": text,
                        "bbox": list(pymupdf.Rect(line["bbox"]) * page.rotation_matrix),
                    }
                )
    links = []
    for link in page.get_links():
        label = page.get_textbox(link["from"]).strip()
        destination = (
            inert_link(link.get("uri")) if link["kind"] == pymupdf.LINK_URI else None
        )
        target_page = (
            link.get("page", -1) + 1 if link["kind"] == pymupdf.LINK_GOTO else None
        )
        if target_page is not None and not 1 <= target_page <= page_count:
            target_page = None
        issue = None if destination or target_page else "unsupported_link"
        if link["kind"] == pymupdf.LINK_URI and destination is None:
            issue = "unsafe_link"
        links.append(
            {
                "label": label,
                "destination": destination,
                "page": target_page,
                "issue": issue,
            }
        )
    raw_characters = sum(characters(line["text"]) for line in raw_lines)
    if (
        len(links) > 1000
        or len(raw_lines) > MAX_CHARACTERS
        or sum(characters(link["label"]) for link in links) > MAX_CHARACTERS
    ):
        raise ConversionError("text_limit")
    return {
        "page": page_number,
        "markdown": markdown,
        "lines": raw_lines,
        "links": links,
        "textStatus": "extracted" if raw_characters else "visual-only",
    }, raw_characters


def convert(source_path, output_path):
    from importlib.metadata import version

    import pymupdf
    import pymupdf4llm

    if version("pymupdf") != "2.1" or version("pymupdf4llm") != "2.1":
        raise ConversionError("conversion_failed")
    pymupdf4llm.use_layout(False)
    pymupdf.set_messages(stream=_DiscardMessages())
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    info = source_path.lstat()
    if not stat.S_ISREG(info.st_mode) or not 8 <= info.st_size <= MAX_INPUT:
        raise ConversionError("invalid_pdf")
    with source_path.open("rb") as stream:
        data = stream.read(MAX_INPUT + 1)
    if not data.startswith(b"%PDF-") or len(data) > MAX_INPUT:
        raise ConversionError("invalid_pdf")
    source_hash = digest(data)
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except (pymupdf.FileDataError, pymupdf.EmptyFileError):
        raise ConversionError("invalid_pdf") from None
    with document:
        if document.is_encrypted or document.needs_pass:
            raise ConversionError("encrypted_pdf")
        if document.is_repaired:
            raise ConversionError("invalid_pdf")
        if not 1 <= document.page_count <= MAX_PAGES:
            raise ConversionError("page_limit")
        dimensions = [(page.rect.width, page.rect.height) for page in document]
        scale, _ = rendering_plan(dimensions)
        output_path.mkdir(mode=0o700)
        (output_path / "pages").mkdir(mode=0o700)
        total_bytes = 0
        text_characters = 0
        raw_characters = 0
        pages = []

        def artifact(path, content):
            nonlocal total_bytes
            if (
                len(content) > MAX_PAGE_BYTES
                or total_bytes + len(content) > MAX_ARTIFACTS
            ):
                raise ConversionError("artifact_limit")
            with (output_path / path).open("xb") as stream:
                stream.write(content)
            total_bytes += len(content)
            return {"path": path, "size": len(content), "sha256": digest(content)}

        for number in range(1, document.page_count + 1):
            page = document[number - 1]
            rotation = page.rotation
            # PyMuPDF4LLM removes rotation in place; retain original evidence geometry.
            try:
                page.set_rotation(0)
                chunks = pymupdf4llm.to_markdown(
                    document,
                    pages=[number - 1],
                    page_chunks=True,
                    write_images=False,
                    embed_images=False,
                    force_text=True,
                    margins=0,
                    show_progress=False,
                )
            finally:
                page.set_rotation(rotation)
            if len(chunks) != 1 or not isinstance(chunks[0]["text"], str):
                raise ConversionError("conversion_failed")
            markdown = chunks[0]["text"]
            evidence, raw_count = page_evidence(
                page, number, document.page_count, markdown, pymupdf
            )
            text_characters += characters(markdown)
            raw_characters += raw_count
            if max(text_characters, raw_characters) > MAX_CHARACTERS:
                raise ConversionError("text_limit")
            extraction = artifact(f"pages/{number}.json", encode_json(evidence))
            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(scale, scale),
                colorspace=pymupdf.csRGB,
                alpha=False,
                annots=True,
            )
            pixmap.set_dpi(round(scale * 72), round(scale * 72))
            image = artifact(f"pages/{number}.png", pixmap.tobytes("png"))
            image.update(
                {"width": pixmap.width, "height": pixmap.height, "dpi": scale * 72}
            )
            del pixmap
            pages.append(
                {
                    "page": number,
                    "widthPoints": page.rect.width,
                    "heightPoints": page.rect.height,
                    "extraction": extraction,
                    "image": image,
                }
            )
        if not raw_characters or not text_characters:
            raise ConversionError("unsupported_scan")
        manifest = {
            "schema": 1,
            "mode": "pymupdf-heuristic",
            "versions": {"pymupdf": "2.1", "pymupdf4llm": "2.1"},
            "source": {"sha256": source_hash, "size": len(data)},
            "textCharacters": text_characters,
            "rawCharacters": raw_characters,
            "artifactBytes": total_bytes,
            "pages": pages,
        }
        encoded = encode_json(manifest)
        if len(encoded) > 256 * 1024 or total_bytes + len(encoded) > MAX_ARTIFACTS:
            raise ConversionError("artifact_limit")
        with (output_path / "manifest.json").open("xb") as stream:
            stream.write(encoded)
        return manifest


def _child(source_path, output_path):
    with open(os.devnull, "wb", buffering=0) as sink:
        os.dup2(sink.fileno(), 1)
        os.dup2(sink.fileno(), 2)
    try:
        import resource

        os.environ.clear()
        os.environ.update(
            {
                "PYTHONDONTWRITEBYTECODE": "1",
                "OMP_NUM_THREADS": "1",
                "OPENBLAS_NUM_THREADS": "1",
                "HF_HUB_OFFLINE": "1",
                "TRANSFORMERS_OFFLINE": "1",
            }
        )
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_BYTES, MEMORY_BYTES))
        resource.setrlimit(resource.RLIMIT_CPU, (WALL_SECONDS, WALL_SECONDS))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_PAGE_BYTES, MAX_PAGE_BYTES))
        convert(source_path, output_path)
    except ConversionError as error:
        sys.exit(ERRORS[error.code])
    except MemoryError:
        sys.exit(ERRORS["resource_limit"])


def supervise(process, timeout=WALL_SECONDS):
    process.start()
    process.join(timeout)
    if process.is_alive():
        process.kill()
        process.join(1)
        return "termination_uncertain" if process.is_alive() else "timeout"
    return next(
        (code for code, status in ERRORS.items() if status == process.exitcode),
        "ok" if process.exitcode == 0 else "conversion_failed",
    )


def main():
    if len(sys.argv) != 1 or sys.platform != "linux":
        result = "unsupported_platform"
    else:
        process = multiprocessing.get_context("spawn").Process(
            target=_child, args=(INPUT, OUTPUT)
        )
        result = supervise(process)
    print(
        json.dumps(
            {"status": "succeeded" if result == "ok" else "failed", "code": result}
        ),
        flush=True,
    )
    return 0 if result == "ok" else 1


if __name__ == "__main__":
    os._exit(main())
