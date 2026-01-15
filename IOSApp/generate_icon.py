#!/usr/bin/env python3
"""
App Icon Generator for Raga Radio
Generates a simple music-themed icon for the iOS app
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient_background(size):
    """Create a gradient background from orange to deep purple"""
    image = Image.new('RGB', size)
    draw = ImageDraw.Draw(image)

    # Create gradient from orange to purple
    for y in range(size[1]):
        ratio = y / size[1]
        r = int(255 * (1 - ratio) + 75 * ratio)  # 255 -> 75
        g = int(140 * (1 - ratio) + 0 * ratio)   # 140 -> 0
        b = int(0 * (1 - ratio) + 130 * ratio)   # 0 -> 130
        draw.line([(0, y), (size[0], y)], fill=(r, g, b))

    return image

def draw_music_note(draw, center_x, center_y, size, color):
    """Draw a stylized music note"""
    # Note head (circle)
    note_radius = size // 8
    draw.ellipse([
        center_x - note_radius,
        center_y + size // 6,
        center_x + note_radius,
        center_y + size // 6 + note_radius * 2
    ], fill=color)

    # Note stem
    stem_width = size // 25
    draw.rectangle([
        center_x + note_radius - stem_width,
        center_y - size // 3,
        center_x + note_radius,
        center_y + size // 6
    ], fill=color)

    # Note flag
    flag_points = [
        (center_x + note_radius, center_y - size // 3),
        (center_x + note_radius + size // 6, center_y - size // 5),
        (center_x + note_radius, center_y - size // 8)
    ]
    draw.polygon(flag_points, fill=color)

def create_icon(output_path, size=1024):
    """Create app icon with music theme"""
    # Create gradient background
    image = create_gradient_background((size, size))
    draw = ImageDraw.Draw(image)

    # Draw musical notes
    center_x = size // 2
    center_y = size // 2

    # Draw main music note (white)
    draw_music_note(draw, center_x, center_y, size, (255, 255, 255))

    # Draw secondary note (slightly transparent white)
    draw_music_note(draw, center_x - size // 5, center_y + size // 10, size * 3 // 4, (255, 255, 255, 200))

    # Add circular border
    border_width = size // 50
    draw.ellipse([
        border_width,
        border_width,
        size - border_width,
        size - border_width
    ], outline=(255, 255, 255, 180), width=border_width)

    # Save the icon
    image.save(output_path, 'PNG', quality=95)
    print(f"Icon created: {output_path}")
    return image

def generate_all_sizes(base_image, output_dir):
    """Generate all required iOS app icon sizes"""
    sizes = {
        'Icon-1024.png': 1024,  # App Store
        'Icon-180.png': 180,    # iPhone App iOS 11,12,13 (60pt @3x)
        'Icon-167.png': 167,    # iPad Pro (83.5pt @2x)
        'Icon-152.png': 152,    # iPad, iPad mini (76pt @2x)
        'Icon-120.png': 120,    # iPhone (60pt @2x)
        'Icon-87.png': 87,      # iPhone (29pt @3x)
        'Icon-80.png': 80,      # iPhone, iPad (40pt @2x)
        'Icon-76.png': 76,      # iPad (76pt @1x)
        'Icon-60.png': 60,      # iPhone (60pt @1x)
        'Icon-58.png': 58,      # iPhone, iPad (29pt @2x)
        'Icon-40.png': 40,      # iPhone, iPad (40pt @1x)
        'Icon-29.png': 29,      # iPhone, iPad (29pt @1x)
    }

    os.makedirs(output_dir, exist_ok=True)

    for filename, size in sizes.items():
        resized = base_image.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, 'PNG', quality=95)
        print(f"Created: {filename} ({size}x{size})")

if __name__ == '__main__':
    # Create main icon
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_icon_path = os.path.join(script_dir, 'AppIcon-1024.png')

    print("Generating Raga Radio app icon...")
    base_icon = create_icon(main_icon_path, 1024)

    # Generate all sizes
    output_dir = os.path.join(script_dir, 'AppIcons')
    print(f"\nGenerating all icon sizes in: {output_dir}")
    generate_all_sizes(base_icon, output_dir)

    print("\n✓ Icon generation complete!")
    print(f"Main icon: {main_icon_path}")
    print(f"All sizes: {output_dir}")
    print("\nTo use these icons:")
    print("1. Open Xcode")
    print("2. Navigate to raag/Assets.xcassets/AppIcon.appiconset")
    print("3. Drag and drop the generated icons into the appropriate slots")
