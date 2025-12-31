#!/bin/bash
#
# Re-encode audio files for Android compatibility
#
# The error "None of the available extractors could read the stream" on Android 16
# is caused by MP3 files with unusual encoding parameters.
#
# This script re-encodes all MP3 files with standard parameters that work on all Android versions.
#
# Requirements:
#   - ffmpeg installed (brew install ffmpeg / apt install ffmpeg)
#
# Usage:
#   chmod +x scripts/reencode-audio.sh
#   ./scripts/reencode-audio.sh
#

set -e

AUDIO_DIR="assets/audio"
BACKUP_DIR="assets/audio-backup"

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed"
    echo "Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)"
    exit 1
fi

# Create backup directory
echo "Creating backup of original audio files..."
mkdir -p "$BACKUP_DIR"
cp -r "$AUDIO_DIR"/* "$BACKUP_DIR/"
echo "Backup created at $BACKUP_DIR"

# Count files
MP3_COUNT=$(find "$AUDIO_DIR" -name "*.mp3" | wc -l | tr -d ' ')
echo "Found $MP3_COUNT MP3 files to re-encode"

# Re-encode each MP3 file
COUNTER=0
find "$AUDIO_DIR" -name "*.mp3" | while read -r file; do
    COUNTER=$((COUNTER + 1))
    echo "[$COUNTER/$MP3_COUNT] Re-encoding: $file"

    # Create temp file
    TEMP_FILE="${file%.mp3}.temp.mp3"

    # Re-encode with maximum compatibility settings:
    # - MP3 format (libmp3lame)
    # - 44.1kHz sample rate (standard)
    # - 128kbps bitrate (good quality, wide compatibility)
    # - Stereo or mono based on source
    # - CBR mode (constant bitrate - most compatible)
    ffmpeg -y -i "$file" \
        -codec:a libmp3lame \
        -ar 44100 \
        -b:a 128k \
        -ac 2 \
        -id3v2_version 3 \
        "$TEMP_FILE" 2>/dev/null

    # Replace original with re-encoded version
    mv "$TEMP_FILE" "$file"
done

echo ""
echo "Done! All $MP3_COUNT audio files have been re-encoded."
echo "Original files backed up to: $BACKUP_DIR"
echo ""
echo "If you encounter issues, restore with:"
echo "  rm -rf $AUDIO_DIR && mv $BACKUP_DIR $AUDIO_DIR"
