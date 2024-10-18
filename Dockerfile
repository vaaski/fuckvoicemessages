FROM denoland/deno:debian
# would've used alpine but https://github.com/denoland/deno_docker/issues/373#issuecomment-2423207496

ARG TELEGRAM_BOT_TOKEN
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

WORKDIR /app

RUN apt update \
	&& apt install -y ffmpeg \
	&& rm -rf /var/lib/apt/lists/*

COPY deno.json deno.lock ./
RUN deno install

COPY src/ src/
RUN deno cache src/main.ts

CMD ["deno", "task", "start"]