FROM python:3.12.16-slim-bookworm@sha256:44cf1793efa7c7a476bb0f2cff81443f4a072c90c1cb127e2924933daa3e8c64

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.lock ./
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes \
    --index-url https://packagefeedproxy.microsoft.io/pypi/simple/ -r requirements.lock \
    && groupadd --gid 10001 converter \
    && useradd --uid 10001 --gid converter --no-create-home --shell /usr/sbin/nologin converter \
    && mkdir -p /work/input \
    && chown -R converter:converter /work
COPY --chown=converter:converter worker.py ./
USER 10001:10001
ENTRYPOINT ["python", "-I", "-B", "/app/worker.py"]
