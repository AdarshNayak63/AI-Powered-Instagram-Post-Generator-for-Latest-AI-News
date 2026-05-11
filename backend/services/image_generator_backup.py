import os
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import requests
from io import BytesIO

class ImageGenerator:
    def __init__(self, template_name="modern_dark"):
        self.template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", template_name)
        self.config = self._load_config()
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Inter-Bold.ttf")
        # Ensure fonts directory and a default font exists, normally we'd download it or include it.
        # For simplicity, if not found, use default ImageFont.load_default()
        
    def _load_config(self):
        config_path = os.path.join(self.template_dir, "config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        return {
            "title_position": [80, 720],
            "image_position": [90, 180],
            "logo_position": [40, 40],
            "title_font_size": 52,
            "description_font_size": 28,
            "image_size": [900, 420]
        }

    def _get_font(self, size):
        try:
            return ImageFont.truetype(self.font_path, size)
        except IOError:
            return ImageFont.load_default()

    def wrap_text(self, text, font, max_width):
        lines = []
        words = text.split()
        while words:
            line = ''
            while words and font.getlength(line + words[0]) <= max_width:
                line = line + (words.pop(0) + ' ')
            lines.append(line)
        return lines

    def generate(self, title: str, description: str, article_image_url: str = None, output_path: str = "output.png"):
        template_name = os.path.basename(self.template_dir)
        
        # Create base image (1080x1080)
        bg_color = tuple(self.config.get("background_color", [15, 15, 15]))
        base = Image.new('RGB', (1080, 1080), color=bg_color)
        draw = ImageDraw.Draw(base)

        # Create template-specific backgrounds
        if template_name == "glassmorphism":
            self._create_glassmorphism_background(base, draw)
        elif template_name == "tech_neon":
            self._create_neon_background(base, draw)
        elif template_name == "minimal_light":
            self._create_minimal_background(base, draw)
        elif template_name in ["professional_clean", "clean_modern", "clean_minimal", "clean_gradient"]:
            self._create_professional_background(base, draw)
        else:  # modern_dark
            self._create_dark_background(base, draw)

        # Load and place article image
        self._add_article_image(base, draw, article_image_url)

        # Add text panel background for better readability
        self._add_text_panel(base, draw, template_name)

        # Draw text content with proper spacing
        self._draw_title(base, draw, title, template_name)
        self._draw_description(base, draw, title, description, template_name)

        # Draw branding
        self._draw_branding(base, draw, template_name)

        base.save(output_path)
        return output_path

    def _create_glassmorphism_background(self, base, draw):
        # Create beautiful gradient background
        bg_color = self.config.get("background_color", [230, 240, 255])
        for y in range(1080):
            ratio = y / 1080
            color = (
                int(bg_color[0] - 20 * ratio),
                int(bg_color[1] - 10 * ratio),
                int(bg_color[2] + 15 * ratio)
            )
            for x in range(1080):
                base.putpixel((x, y), color)

    def _create_neon_background(self, base, draw):
        # Dark gradient with neon feel
        bg_color = self.config.get("background_color", [8, 3, 36])
        for y in range(1080):
            ratio = y / 1080
            color = (
                int(bg_color[0] + 15 * ratio),
                int(bg_color[1] + 20 * ratio),
                int(bg_color[2] + 40 * ratio)
            )
            for x in range(1080):
                base.putpixel((x, y), color)

    def _create_minimal_background(self, base, draw):
        # Clean white background with subtle gradient
        bg_color = self.config.get("background_color", [250, 250, 252])
        for y in range(1080):
            ratio = y / 1080
            color = (
                int(bg_color[0] - 8 * ratio),
            )
            draw.line([(0, y), (1080, y)], fill=color)

    def _create_dark_background(self, base, draw):
        # Dark gradient
        bg_color = self.config.get("background_color", [20, 20, 25])
        for y in range(1080):
            ratio = y / 1080
            color = (
                int(bg_color[0] + 10 * ratio),
                int(bg_color[1] + 10 * ratio),
                int(bg_color[2] + 15 * ratio)
            )
            for x in range(1080):
                base.putpixel((x, y), color)

    def _create_professional_background(self, base, draw):
        # Pure white background for professional look
        draw.rectangle([0, 0, 1080, 1080], fill=(255, 255, 255))

    def _add_article_image(self, base, draw, article_image_url):
        if not article_image_url:
            return
            
        try:
            response = requests.get(article_image_url, timeout=10)
            art_img = Image.open(BytesIO(response.content)).convert("RGBA")
            target_size = tuple(self.config.get("image_size", [960, 480]))
            art_img = ImageOps.fit(art_img, target_size, Image.Resampling.LANCZOS)
            
            # Apply rounded corners
            border_radius = self.config.get("border_radius", 16)
            mask = Image.new("L", target_size, 0)
            draw_mask = ImageDraw.Draw(mask)
            try:
                draw_mask.rounded_rectangle((0, 0) + target_size, radius=border_radius, fill=255)
            except TypeError:
                draw_mask.rectangle((0, 0) + target_size, fill=255)
            art_img.putalpha(mask)

            base.paste(art_img, tuple(self.config.get("image_position", [60, 120])), art_img)
        except Exception as e:
            print(f"Failed to load article image: {e}")

    def _add_text_panel(self, base, draw, template_name):
        panel_width = 960
        panel_height = 320
        panel_x = 60
        panel_y = 570
        
        # Template-specific panel styling
        if template_name == "glassmorphism":
            # Glass panel with blur
            glass_panel = Image.new('RGBA', (panel_width, panel_height), (255, 255, 255, int(255 * self.config.get("glass_opacity", 0.3))))
            glass_draw = ImageDraw.Draw(glass_panel)
            
            glass_blur = self.config.get("glass_blur", 20)
            glass_panel = glass_panel.filter(ImageFilter.GaussianBlur(radius=glass_blur))
            
            border_radius = self.config.get("border_radius", 16)
            try:
                glass_draw.rounded_rectangle([0, 0, panel_width, panel_height], radius=border_radius, outline=(200, 210, 255, 100), width=2)
            except TypeError:
                glass_draw.rectangle([0, 0, panel_width, panel_height], outline=(200, 210, 255, 100), width=2)
            
            base.paste(glass_panel, (panel_x, panel_y), glass_panel)
            
        elif template_name == "tech_neon":
            # Neon panel with glow
            panel = Image.new('RGBA', (panel_width, panel_height), (15, 5, 30, int(255 * 0.85)))
            panel_draw = ImageDraw.Draw(panel)
            
            border_radius = self.config.get("border_radius", 12)
            accent_color = tuple(self.config.get("accent_color", [255, 69, 0]))
            try:
                panel_draw.rounded_rectangle([0, 0, panel_width, panel_height], radius=border_radius, outline=accent_color + (180,), width=3)
            except TypeError:
                panel_draw.rectangle([0, 0, panel_width, panel_height], outline=accent_color + (180,), width=3)
            
            base.paste(panel, (panel_x, panel_y), panel)
            
        elif template_name == "minimal_light":
            # Clean minimal panel
            panel = Image.new('RGBA', (panel_width, panel_height), (255, 255, 255, int(255 * 0.98)))
            panel_draw = ImageDraw.Draw(panel)
            
            border_radius = self.config.get("border_radius", 8)
            accent_color = tuple(self.config.get("accent_color", [34, 197, 94]))
            try:
                panel_draw.rounded_rectangle([0, 0, panel_width, panel_height], radius=border_radius, outline=accent_color + (150,), width=2)
            except TypeError:
                panel_draw.rectangle([0, 0, panel_width, panel_height], outline=accent_color + (150,), width=2)
            
            base.paste(panel, (panel_x, panel_y), panel)
            
        elif template_name in ["professional_clean", "clean_modern", "clean_minimal", "clean_gradient"]:
            # No panel for clean templates - text directly on background
            pass
            
        else:  # modern_dark
            # Dark panel with accent
            panel = Image.new('RGBA', (panel_width, panel_height), (25, 25, 30, int(255 * 0.95)))
            panel_draw = ImageDraw.Draw(panel)
            
            border_radius = self.config.get("border_radius", 12)
            accent_color = tuple(self.config.get("accent_color", [41, 121, 255]))
            try:
                panel_draw.rounded_rectangle([0, 0, panel_width, panel_height], radius=border_radius, outline=accent_color + (180,), width=2)
            except TypeError:
                panel_draw.rectangle([0, 0, panel_width, panel_height], outline=accent_color + (180,), width=2)
            
            base.paste(panel, (panel_x, panel_y), panel)

    def _draw_title(self, base, draw, title, template_name):
        title_font = self._get_font(self.config.get("title_font_size", 68))
        title_lines = self.wrap_text(title, title_font, 880)  # Reduced width to prevent overflow
        x_pos = self.config.get("title_position", [60, 650])[0]
        y_pos = self.config.get("title_position", [60, 650])[1]
        title_color = tuple(self.config.get("text_color", [255, 255, 255]))
        
        # Limit to 2 lines for title to prevent overflow
        title_lines = title_lines[:2]
        
        for i, line in enumerate(title_lines):
            # Add shadow for better readability
            if template_name in ["professional_clean", "clean_modern", "clean_minimal", "clean_gradient"]:
                # No shadow for clean professional look
                shadow_offset = 0
                shadow_alpha = 0
            else:
                shadow_offset = 2
                shadow_alpha = 120 if template_name in ["glassmorphism", "tech_neon"] else 100
            if shadow_offset > 0:
                draw.text((x_pos + shadow_offset, y_pos + shadow_offset), line, font=title_font, fill=(0, 0, 0, shadow_alpha))
            
            # Draw main text
            draw.text((x_pos, y_pos), line, font=title_font, fill=title_color)
            y_pos += title_font.size + 8  # Proper spacing between lines

    def _draw_description(self, base, draw, title, description, template_name):
        desc_font = self._get_font(self.config.get("description_font_size", 38))
        desc_lines = self.wrap_text(description, desc_font, 880)  # Reduced width
        x_pos = self.config.get("title_position", [60, 650])[0]
        
        # Calculate description position based on actual title lines
        title_font = self._get_font(self.config.get("title_font_size", 68))
        # Use the same title_lines from the _draw_title method
        title_lines_for_height = self.wrap_text(title, title_font, 880)[:2]  # Same limit as title
        title_height = len(title_lines_for_height) * (title_font.size + 8)
        y_pos = self.config.get("title_position", [60, 650])[1] + title_height + 20  # 20px gap
        
        desc_color = tuple(self.config.get("description_color", [180, 180, 180]))
        
        # Limit to 2 lines for description to prevent overflow
        desc_lines = desc_lines[:2]
        
        for line in desc_lines:
            # Add shadow for readability
            if template_name in ["professional_clean", "clean_modern", "clean_minimal", "clean_gradient"]:
                # No shadow for clean professional look
                shadow_offset = 0
                shadow_alpha = 0
            else:
                shadow_offset = 2
                shadow_alpha = 100 if template_name in ["glassmorphism", "tech_neon"] else 80
            if shadow_offset > 0:
                draw.text((x_pos + shadow_offset, y_pos + shadow_offset), line, font=desc_font, fill=(0, 0, 0, shadow_alpha))
            
            # Draw main text
            draw.text((x_pos, y_pos), line, font=desc_font, fill=desc_color)
            y_pos += desc_font.size + 6  # Proper spacing between lines

    def _draw_branding(self, base, draw, template_name):
        logo_pos = self.config.get("logo_position", [40, 40])
        accent_color = tuple(self.config.get("accent_color", [41, 121, 255]))
        
        if template_name == "glassmorphism":
            # Glass logo with blur effect
            logo_size = 70
            logo_bg = Image.new('RGBA', (logo_size, logo_size), (255, 255, 255, int(255 * 0.3)))
            logo_bg = logo_bg.filter(ImageFilter.GaussianBlur(radius=8))
            base.paste(logo_bg, (logo_pos[0], logo_pos[1]), logo_bg)
            
            # Draw border
            border_radius = self.config.get("border_radius", 16)
            try:
                draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                    radius=border_radius, outline=(200, 210, 255, 150), width=2)
            except TypeError:
                draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                             outline=(200, 210, 255, 150), width=2)
            text_color = (5, 15, 35)
            
        elif template_name == "tech_neon":
            # Neon logo with glow
            logo_size = 70
            neon_color = tuple(self.config.get("accent_color", [255, 69, 0]))
            
            # Glow effect
            for i in range(2):
                glow_size = logo_size + i * 6
                glow_alpha = 80 - i * 25
                draw.rectangle([logo_pos[0] - i*3, logo_pos[1] - i*3, 
                              logo_pos[0] + glow_size + i*3, logo_pos[1] + glow_size + i*3], 
                             outline=neon_color + (glow_alpha,), width=2)
            
            # Main border
            border_radius = self.config.get("border_radius", 12)
            try:
                draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                    radius=border_radius, outline=neon_color + (200,), width=3)
            except TypeError:
                draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                             outline=neon_color + (200,), width=3)
            text_color = (255, 255, 255)
            
        elif template_name == "minimal_light":
            # Clean minimal logo
            logo_size = 70
            border_radius = self.config.get("border_radius", 8)
            try:
                draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                    radius=border_radius, outline=accent_color + (180,), width=2)
            except TypeError:
                draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                             outline=accent_color + (180,), width=2)
            text_color = (10, 18, 30)
            
        elif template_name == "professional_clean":
            # Professional clean logo with filled accent
            logo_size = 75
            border_radius = self.config.get("border_radius", 12)
            try:
                draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                    radius=border_radius, fill=accent_color, outline=None)
            except TypeError:
                draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                             fill=accent_color, outline=None)
            text_color = (10, 10, 10)
            
        else:  # modern_dark
            # Dark logo with filled accent
            logo_size = 70
            border_radius = self.config.get("border_radius", 12)
            try:
                draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                    radius=border_radius, fill=accent_color, outline=None)
            except TypeError:
                draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                             fill=accent_color, outline=None)
            text_color = (255, 255, 255)
        
        # Brand text with better font
        brand_font = self._get_font(32)
        brand_text = "AI Tech News"
        text_x = logo_pos[0] + 80
        text_y = logo_pos[1] + 22
        
        # Add shadow to brand text
        if template_name in ["professional_clean", "clean_modern", "clean_minimal", "clean_gradient"]:
            # No shadow for clean professional look
            draw.text((text_x, text_y), brand_text, font=brand_font, fill=text_color)
        else:
            draw.text((text_x + 1, text_y + 1), brand_text, font=brand_font, fill=(0, 0, 0, 80))
            draw.text((text_x, text_y), brand_text, font=brand_font, fill=text_color)
