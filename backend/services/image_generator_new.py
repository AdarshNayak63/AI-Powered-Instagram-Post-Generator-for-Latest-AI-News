import os
import json
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from io import BytesIO
from datetime import datetime

class NewImageGenerator:
    def __init__(self, template_name="professional_clean"):
        self.template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", template_name)
        self.config = self._load_config()
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Inter-Bold.ttf")
        
    def _load_config(self):
        config_path = os.path.join(self.template_dir, "config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        return self._get_default_config()
    
    def _get_default_config(self):
        return {
            "title_position": [70, 580],
            "image_position": [70, 100],
            "logo_position": [30, 30],
            "title_font_size": 85,
            "description_font_size": 48,
            "image_size": [940, 420],
            "background_color": [255, 255, 255],
            "text_color": [10, 10, 10],
            "description_color": [60, 60, 60],
            "accent_color": [0, 122, 255],
            "border_radius": 12
        }
    
    def _get_font(self, size):
        try:
            return ImageFont.truetype(self.font_path, size)
        except:
            return ImageFont.load_default()
    
    def wrap_text(self, text, font, max_width):
        lines = []
        words = text.split()
        current_line = ""
        
        for word in words:
            test_line = current_line + " " + word if current_line else word
            bbox = font.getbbox(test_line)
            text_width = bbox[2] - bbox[0]
            
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
        
        return lines
    
    def generate(self, title: str, description: str, article_image_url: str = None, output_path: str = "output.png"):
        # Create clean white background
        base = Image.new('RGB', (1080, 1080), color=(255, 255, 255))
        draw = ImageDraw.Draw(base)
        
        # Add article image
        if article_image_url:
            try:
                response = requests.get(article_image_url, timeout=10)
                art_img = Image.open(BytesIO(response.content)).convert("RGBA")
                target_size = tuple(self.config.get("image_size", [940, 420]))
                art_img = ImageOps.fit(art_img, target_size, Image.Resampling.LANCZOS)
                
                # Add rounded corners
                mask = Image.new('L', target_size, 0)
                mask_draw = ImageDraw.Draw(mask)
                border_radius = self.config.get("border_radius", 12)
                try:
                    mask_draw.rounded_rectangle((0, 0) + target_size, radius=border_radius, fill=255)
                except TypeError:
                    mask_draw.rectangle((0, 0) + target_size, fill=255)
                art_img.putalpha(mask)
                
                image_pos = tuple(self.config.get("image_position", [70, 100]))
                base.paste(art_img, image_pos, art_img)
            except Exception as e:
                print(f"Failed to load article image: {e}")
        
        # Draw title - LARGE AND BOLD
        title_font = self._get_font(self.config.get("title_font_size", 85))
        title_lines = self.wrap_text(title, title_font, 900)
        title_lines = title_lines[:2]  # Max 2 lines
        
        title_x = self.config.get("title_position", [70, 580])[0]
        title_y = self.config.get("title_position", [70, 580])[1]
        title_color = tuple(self.config.get("text_color", [10, 10, 10]))
        
        for line in title_lines:
            draw.text((title_x, title_y), line, font=title_font, fill=title_color)
            title_y += title_font.size + 10  # Spacing between lines
        
        # Draw description
        desc_font = self._get_font(self.config.get("description_font_size", 48))
        desc_lines = self.wrap_text(description, desc_font, 900)
        desc_lines = desc_lines[:2]  # Max 2 lines
        
        desc_x = self.config.get("title_position", [70, 580])[0]
        desc_y = title_y + 20  # Gap after title
        desc_color = tuple(self.config.get("description_color", [60, 60, 60]))
        
        for line in desc_lines:
            draw.text((desc_x, desc_y), line, font=desc_font, fill=desc_color)
            desc_y += desc_font.size + 8  # Spacing between lines
        
        # Draw logo
        logo_pos = self.config.get("logo_position", [30, 30])
        accent_color = tuple(self.config.get("accent_color", [0, 122, 255]))
        logo_size = 75
        
        try:
            draw.rounded_rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                                radius=12, fill=accent_color, outline=None)
        except TypeError:
            draw.rectangle([logo_pos[0], logo_pos[1], logo_pos[0] + logo_size, logo_pos[1] + logo_size], 
                         fill=accent_color, outline=None)
        
        # Draw brand text
        brand_font = self._get_font(32)
        brand_text = "AI Tech News"
        brand_x = logo_pos[0] + 85
        brand_y = logo_pos[1] + 25
        draw.text((brand_x, brand_y), brand_text, font=brand_font, fill=title_color)
        
        base.save(output_path)
        return output_path
