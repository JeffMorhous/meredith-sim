"""Package the playable site into one HTML file for offline use."""

import base64
from html import escape
from html.parser import HTMLParser
import json
import mimetypes
from pathlib import Path
import re


GAME = Path(__file__).resolve().parent
SITE = GAME / "dist"
OUTPUT = GAME.parent / "meredith simulator.html"
ASSETS = "assets/"
POLICY = (
    "default-src 'none'; img-src data:; font-src data:; "
    "style-src 'unsafe-inline'; script-src 'unsafe-inline'"
)
CSS_URL = re.compile(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s)]+))\s*\)", re.I)
MARKUP_ASSET = re.compile(r"\b(src|href)=(['\"])(assets/[^'\"]+)(\2)")
DYNAMIC_ASSET = re.compile(
    r"(?P<q>['\"])(?P<prefix>assets/[^'\"]*)(?P=q)\s*\+\s*"
    r"(?P<variable>[$\w]+)(?:\s*\+\s*(?P=q)(?P<suffix>[^'\"]*)(?P=q))?"
)


def data_url(path):
    mime_type = "font/ttf" if path.suffix == ".ttf" else mimetypes.guess_type(path.name)[0]
    if mime_type is None:
        raise ValueError(f"Unknown asset format: {path}")
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{data}"


def embed_css(css, assets):
    if re.search(r"@import\b", css, re.I):
        raise ValueError("Inline CSS imports before building the offline edition.")

    def replace_url(match):
        path = next(value for value in match.groups() if value is not None)
        return 'url("' + assets[path] + '")'

    return CSS_URL.sub(replace_url, css)


def embed_script(script, assets):
    def replace_markup(match):
        attribute, quote, path, _ = match.groups()
        return f"{attribute}={quote}{assets[path]}{quote}"

    def replace_expression(match):
        prefix = match["prefix"].removeprefix(ASSETS)
        suffix = match["suffix"] or ""
        expression = " + ".join((json.dumps(prefix), match["variable"], json.dumps(suffix)))
        return f"window.giftAsset({expression})"

    script = DYNAMIC_ASSET.sub(replace_expression, script)
    script = MARKUP_ASSET.sub(replace_markup, script)
    if ASSETS in script or re.search(r"</script\b", script, re.I):
        raise ValueError("Script contains an asset expression or tag that could not be inlined.")
    return script


class GiftPage(HTMLParser):
    def __init__(self, assets):
        super().__init__(convert_charrefs=False)
        self.assets = assets
        self.parts = []
        self.deferred = []
        self.skipping_script = False

    def local_file(self, path):
        resolved = (SITE / path).resolve()
        resolved.relative_to(SITE)
        return resolved.read_text(encoding="utf-8")

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "script":
            if not values.get("src") or "defer" not in values or values.get("type"):
                raise ValueError("Expected a deferred, classic script with a local src.")
            self.deferred.append(embed_script(self.local_file(values["src"]), self.assets))
            self.skipping_script = True
            return
        if tag == "link" and values.get("rel") == "stylesheet":
            css = embed_css(self.local_file(values["href"]), self.assets)
            self.parts.append(f"<style>\n{css}\n</style>")
            return
        if tag == "link" and values.get("rel") == "preload":
            if values["href"] not in self.assets:
                raise ValueError(f"Unknown preload asset: {values['href']}")
            return
        if "srcset" in values:
            raise ValueError("Inline srcset images before building the offline edition.")

        if "src" in values or "href" in values:
            rewritten_attrs = []
            for attribute, value in attrs:
                if attribute in {"src", "href"}:
                    value = self.assets[value]
                rewritten_attrs.append(attribute if value is None else f'{attribute}="{escape(value, quote=True)}"')
            self.parts.append(f"<{tag} {' '.join(rewritten_attrs)}>")
        else:
            self.parts.append(self.get_starttag_text())
        if tag == "head":
            self.parts.append(f'\n  <meta http-equiv="Content-Security-Policy" content="{POLICY}">')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "script" and self.skipping_script:
            self.skipping_script = False
            return
        if tag == "body":
            payload = json.dumps({path.removeprefix(ASSETS): url for path, url in self.assets.items()})
            self.parts.append(
                '<script type="application/json" id="gift-assets">' + payload + "</script>\n"
                "<script>\n"
                "window.giftAsset = (() => {\n"
                "  const images = JSON.parse(document.getElementById('gift-assets').textContent);\n"
                "  return path => {\n"
                "    if (!Object.prototype.hasOwnProperty.call(images, path)) {\n"
                "      throw new Error('Missing bundled asset: ' + path);\n"
                "    }\n"
                "    return images[path];\n"
                "  };\n"
                "})();\n"
                "</script>\n"
            )
            self.parts.extend(f"<script>\n{script}\n</script>\n" for script in self.deferred)
            license_text = self.local_file("assets/pixelify-license.txt")
            self.parts.append(f'\n<script type="text/plain" id="pixelify-license">\n{license_text}</script>\n')
        self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skipping_script:
            self.parts.append(data)

    def handle_decl(self, decl):
        self.parts.append(f"<!{decl}>")

    def handle_comment(self, text):
        self.parts.append(f"<!--{text}-->")

    def handle_entityref(self, name):
        self.parts.append(f"&{name};")

    def handle_charref(self, name):
        self.parts.append(f"&#{name};")


def build():
    assets = {
        path.relative_to(SITE).as_posix(): data_url(path)
        for path in sorted((SITE / ASSETS).rglob("*"))
        if path.is_file() and path.suffix != ".txt" and not path.name.startswith(".")
    }
    page = GiftPage(assets)
    page.feed((SITE / "index.html").read_text(encoding="utf-8"))
    page.close()
    OUTPUT.write_text("".join(page.parts), encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
