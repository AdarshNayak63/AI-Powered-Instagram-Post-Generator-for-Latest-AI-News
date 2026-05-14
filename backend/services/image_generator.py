import os
from io import BytesIO
from typing import List, Tuple

import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


class ImageGenerator:
    CANVAS_SIZE = (1080, 1080)

    SAFE_PAD_X = 56
    SAFE_PAD_TOP = 36
    SAFE_PAD_BOTTOM = 36

    CARD_RADIUS = 36
    HERO_HEIGHT = 500
    FOOTER_HEIGHT = 90

    BG_COLOR = (15, 17, 26)
    CARD_COLOR = (8, 10, 20)
    TEXT_PRIMARY = (245, 246, 250)
    TEXT_SECONDARY = (176, 182, 196)
    DIVIDER_COLOR = (44, 48, 61)
    ACCENT_RED = (216, 21, 33)
    WHITE = (255, 255, 255)

    HEADLINE_MIN = 90
    HEADLINE_MAX = 130
    SUBHEAD_MIN = 38
    SUBHEAD_MAX = 52
    FOOTER_MIN = 32
    FOOTER_MAX = 42
    BADGE_MIN = 28
    BADGE_MAX = 40
    BULLET_MIN = 38
    BULLET_MAX = 46

    def __init__(self, template_name: str = "news_card"):
        self.template_name = template_name
        self.font_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts")

    def _font(self, size: int, bold: bool = False):
        if bold:
            candidates = [
                "Inter-Bold.ttf",
                "Poppins-Bold.ttf",
                "Montserrat-Bold.ttf",
                "Arial-Bold.ttf",
            ]
        else:
            candidates = [
                "Inter-Regular.ttf",
                "Poppins-Regular.ttf",
                "Montserrat-Regular.ttf",
                "Arial.ttf",
            ]
        for name in candidates:
            path = os.path.join(self.font_dir, name)
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    continue
        return ImageFont.load_default()

    def _text_width(self, draw: ImageDraw.ImageDraw, text: str, font) -> int:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]

    def _line_height(self, draw: ImageDraw.ImageDraw, font) -> int:
        bbox = draw.textbbox((0, 0), "Ag", font=font)
        return bbox[3] - bbox[1]

    def _wrap(self, draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> List[str]:
        text = (text or "").strip()
        if not text:
            return []
        words = text.split()
        lines: List[str] = []
        current = ""
        for word in words:
            probe = word if not current else f"{current} {word}"
            if self._text_width(draw, probe, font) <= max_width:
                current = probe
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines

    def _fit_text_block(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        min_size: int,
        max_size: int,
        max_width: int,
        max_height: int,
        max_lines: int,
        bold: bool,
    ) -> Tuple[ImageFont.FreeTypeFont, List[str], int]:
        text = (text or "").strip()
        best_font = self._font(min_size, bold=bold)
        best_lines = self._wrap(draw, text, best_font, max_width)[:max_lines] if text else []
        best_size = min_size

        for size in range(max_size, min_size - 1, -2):
            font = self._font(size, bold=bold)
            lines = self._wrap(draw, text, font, max_width) if text else []
            if not lines:
                return font, [], size

            if len(lines) > max_lines:
                continue

            lh = self._line_height(draw, font)
            line_gap = max(8, int(size * 0.18))
            total_height = len(lines) * lh + (len(lines) - 1) * line_gap
            longest = max(self._text_width(draw, l, font) for l in lines)
            if total_height <= max_height and longest <= max_width:
                return font, lines, size

            best_font, best_lines, best_size = font, lines[:max_lines], size

        if best_lines and len(best_lines) == max_lines:
            last = best_lines[-1].rstrip(" .,:;")
            best_lines[-1] = f"{last}..."
        return best_font, best_lines, best_size

    def _download_or_fallback_hero(self, width: int, height: int, image_url: str = None) -> Image.Image:
        fallback = Image.new("RGB", (width, height), (36, 40, 52))
        fdraw = ImageDraw.Draw(fallback)
        title_font = self._font(52, bold=True)
        desc_font = self._font(32, bold=False)
        fdraw.text((48, height // 2 - 52), "News Visual", fill=(236, 238, 244), font=title_font)
        fdraw.text((48, height // 2 + 14), "No source image available", fill=(198, 203, 214), font=desc_font)

        if not image_url:
            return fallback

        try:
            resp = requests.get(image_url, timeout=14)
            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content)).convert("RGB")
            return ImageOps.fit(img, (width, height), Image.Resampling.LANCZOS)
        except Exception as exc:
            print(f"Failed to load hero image: {exc}")
            return fallback

    def _round_mask(self, size: Tuple[int, int], radius: int) -> Image.Image:
        mask = Image.new("L", size, 0)
        d = ImageDraw.Draw(mask)
        d.rounded_rectangle([0, 0, size[0], size[1]], radius=radius, fill=255)
        return mask

    def _draw_shadow_card(self, base: Image.Image, rect: Tuple[int, int, int, int], radius: int):
        shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow)
        x1, y1, x2, y2 = rect
        sdraw.rounded_rectangle([x1 + 6, y1 + 8, x2 + 6, y2 + 8], radius=radius, fill=(0, 0, 0, 170))
        shadow = shadow.filter(ImageFilter.GaussianBlur(16))
        base.alpha_composite(shadow)

    def generate(
        self,
        title: str,
        description: str,
        article_image_url: str = None,
        output_path: str = "output.png",
        layout_data: dict = None,
    ):
        layout_data = layout_data or {}
        category = (layout_data.get("category") or "AI").upper().strip()[:14]
        subtitle = (layout_data.get("subtitle") or "Latest update").strip()
        bullet_point = (layout_data.get("bullet_point") or description or "").strip()
        alert_label = (layout_data.get("alert_label") or "NEWS ALERT").upper().strip()[:28]

        canvas = Image.new("RGBA", self.CANVAS_SIZE, self.BG_COLOR + (255,))

        card_left = self.SAFE_PAD_X
        card_top = self.SAFE_PAD_TOP
        card_right = self.CANVAS_SIZE[0] - self.SAFE_PAD_X
        card_bottom = self.CANVAS_SIZE[1] - self.SAFE_PAD_BOTTOM
        card_rect = (card_left, card_top, card_right, card_bottom)

        self._draw_shadow_card(canvas, card_rect, self.CARD_RADIUS)
        cdraw = ImageDraw.Draw(canvas)
        cdraw.rounded_rectangle(card_rect, radius=self.CARD_RADIUS, fill=self.CARD_COLOR)

        hero_left = card_left + 18
        hero_top = card_top + 18
        hero_right = card_right - 18
        hero_bottom = hero_top + self.HERO_HEIGHT
        hero_w = hero_right - hero_left
        hero_h = hero_bottom - hero_top

        hero = self._download_or_fallback_hero(hero_w, hero_h, article_image_url).convert("RGBA")
        hero_mask = self._round_mask((hero_w, hero_h), 24)
        hero.putalpha(hero_mask)
        canvas.alpha_composite(hero, (hero_left, hero_top))

        overlay = Image.new("RGBA", (hero_w, hero_h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for y in range(hero_h):
            alpha = int(max(0, (y - hero_h * 0.6) / (hero_h * 0.4)) * 165)
            od.line([(0, y), (hero_w, y)], fill=(5, 8, 17, alpha))
        canvas.alpha_composite(overlay, (hero_left, hero_top))
        draw = ImageDraw.Draw(canvas)

        badge_font, badge_lines, badge_size = self._fit_text_block(
            draw,
            category,
            self.BADGE_MIN,
            self.BADGE_MAX,
            max_width=280,
            max_height=58,
            max_lines=1,
            bold=True,
        )
        badge_text = badge_lines[0] if badge_lines else category
        badge_w = self._text_width(draw, badge_text, badge_font) + 42
        badge_h = self._line_height(draw, badge_font) + 16
        badge_x = hero_left + 22
        badge_y = hero_bottom - badge_h - 18
        draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=24, fill=self.ACCENT_RED)
        draw.text((badge_x + 21, badge_y + 8), badge_text, font=badge_font, fill=self.WHITE)

        text_left = card_left + 32
        text_right = card_right - 32
        text_width = text_right - text_left

        footer_top = card_bottom - self.FOOTER_HEIGHT
        body_top = hero_bottom + 26
        body_bottom = footer_top - 22
        body_height = body_bottom - body_top

        headline_alloc = int(body_height * 0.60)
        sub_alloc = int(body_height * 0.16)
        bullet_alloc = body_height - headline_alloc - sub_alloc - 26

        headline_font, headline_lines, headline_size = self._fit_text_block(
            draw,
            title or "",
            self.HEADLINE_MIN,
            self.HEADLINE_MAX,
            max_width=text_width,
            max_height=headline_alloc,
            max_lines=5,
            bold=True,
        )
        if not headline_lines:
            headline_lines = ["Latest Headline"]
        headline_lines = headline_lines[:5]

        y = body_top
        h_lh = self._line_height(draw, headline_font)
        h_gap = max(10, int(headline_size * 0.18))
        for line in headline_lines:
            draw.text((text_left, y), line, font=headline_font, fill=self.TEXT_PRIMARY)
            y += h_lh + h_gap
        y += 4

        adaptive_sub_max = self.SUBHEAD_MAX
        adaptive_bullet_max = self.BULLET_MAX
        if len(headline_lines) >= 4:
            adaptive_sub_max = max(self.SUBHEAD_MIN, self.SUBHEAD_MAX - 6)
            adaptive_bullet_max = max(self.BULLET_MIN, self.BULLET_MAX - 6)
        elif len(headline_lines) == 3:
            adaptive_sub_max = max(self.SUBHEAD_MIN, self.SUBHEAD_MAX - 2)
            adaptive_bullet_max = max(self.BULLET_MIN, self.BULLET_MAX - 2)

        sub_font, sub_lines, sub_size = self._fit_text_block(
            draw,
            subtitle,
            self.SUBHEAD_MIN,
            adaptive_sub_max,
            max_width=text_width,
            max_height=sub_alloc,
            max_lines=2,
            bold=False,
        )
        if sub_lines:
            sub_lh = self._line_height(draw, sub_font)
            sub_gap = max(6, int(sub_size * 0.16))
            for line in sub_lines[:2]:
                draw.text((text_left, y), line, font=sub_font, fill=self.TEXT_SECONDARY)
                y += sub_lh + sub_gap

        draw.line([(text_left, y + 6), (text_right, y + 6)], fill=self.DIVIDER_COLOR, width=3)
        y += 24

        bullet_font, bullet_lines, bullet_size = self._fit_text_block(
            draw,
            bullet_point,
            self.BULLET_MIN,
            adaptive_bullet_max,
            max_width=text_width - 34,
            max_height=bullet_alloc,
            max_lines=3,
            bold=False,
        )

        dot_y = y + 17
        draw.ellipse([text_left, dot_y, text_left + 14, dot_y + 14], fill=self.ACCENT_RED)
        bullet_x = text_left + 26
        b_lh = self._line_height(draw, bullet_font)
        b_gap = max(8, int(bullet_size * 0.16))
        for line in bullet_lines:
            draw.text((bullet_x, y), line, font=bullet_font, fill=(230, 233, 240))
            y += b_lh + b_gap

        draw.rectangle([card_left, footer_top, card_right, card_bottom], fill=self.ACCENT_RED)

        footer_font, footer_lines, _ = self._fit_text_block(
            draw,
            alert_label,
            self.FOOTER_MIN,
            self.FOOTER_MAX,
            max_width=(card_right - card_left) - 80,
            max_height=self.FOOTER_HEIGHT - 22,
            max_lines=1,
            bold=True,
        )
        footer_text = footer_lines[0] if footer_lines else alert_label
        fw = self._text_width(draw, footer_text, footer_font)
        fh = self._line_height(draw, footer_font)
        fx = card_left + ((card_right - card_left - fw) // 2)
        fy = footer_top + ((self.FOOTER_HEIGHT - fh) // 2) - 2
        draw.text((fx, fy), footer_text, font=footer_font, fill=self.WHITE)

        rgb = canvas.convert("RGB")
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        rgb.save(output_path)
        return output_path
