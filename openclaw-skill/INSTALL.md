# Installation Guide for kindle-clip OpenClaw Skill

This guide helps you install the kindle-clip skill for use with OpenClaw and AI agents.

## Prerequisites

- An OpenClaw-compatible AI agent or system
- macOS, Linux, or Windows operating system
- Internet connection for downloading the binary

## Step 1: Install the kindle-clip Binary

**⚠️ Security Note:** Always verify binaries before installation. Avoid piping remote scripts directly to shell (`curl | sh`) as this can execute untrusted code.

Choose one of the following secure installation methods:

### Option A: Download from GitHub Releases (Recommended)

1. Go to https://github.com/emersonding/kindle-clip-processor/releases
2. Download the appropriate archive for your platform:
   - macOS Intel: `kindle-clip_VERSION_darwin_amd64.tar.gz`
   - macOS Apple Silicon: `kindle-clip_VERSION_darwin_arm64.tar.gz`
   - Linux: `kindle-clip_VERSION_linux_amd64.tar.gz` or `kindle-clip_VERSION_linux_arm64.tar.gz`
   - Windows: `kindle-clip_VERSION_windows_amd64.zip` or `kindle-clip_VERSION_windows_arm64.zip`
3. **Optional but recommended:** Verify the checksum
   ```bash
   # Download checksums.txt from the same release
   # Verify your download matches the published checksum
   shasum -a 256 kindle-clip_*.tar.gz
   # Compare with checksums.txt
   ```
4. Extract the archive:
   ```bash
   tar -xzf kindle-clip_*.tar.gz  # macOS/Linux
   # or unzip for Windows .zip files
   ```
5. Move the `kindle-clip` binary to a directory in your PATH:
   ```bash
   # macOS/Linux - user directory (no sudo needed, recommended)
   mkdir -p ~/.local/bin
   mv kindle-clip ~/.local/bin/
   export PATH="$HOME/.local/bin:$PATH"

   # Or system-wide (requires sudo)
   sudo mv kindle-clip /usr/local/bin/
   ```

**Verify Installation**:
```bash
kindle-clip --help
```

If you get "command not found", add the installation directory to your PATH:

```bash
# For bash users (add to ~/.bashrc or ~/.bash_profile)
export PATH="$HOME/.local/bin:$PATH"

# For zsh users (add to ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"

# Then reload your shell
source ~/.bashrc  # or source ~/.zshrc
```

### Option B: Build from Source

If you have Go installed:

```bash
git clone https://github.com/emersonding/kindle-clip-processor.git
cd kindle-clip-processor
go build -o kindle-clip ./cmd/kindle-clip
sudo mv kindle-clip /usr/local/bin/
```

## Step 2: Install the OpenClaw Skill

### Method 1: Direct Download

If OpenClaw supports direct skill installation, download this skill bundle to your OpenClaw skills directory.

### Method 2: Manual Installation

1. Clone or download the kindle-clip-processor repository
2. Copy the `openclaw-skill` directory to your OpenClaw skills directory:
   ```bash
   cp -r openclaw-skill /path/to/openclaw/skills/kindle-clip
   ```

### Method 3: Symbolic Link (for development)

```bash
ln -s /path/to/kindle-clip-processor/openclaw-skill /path/to/openclaw/skills/kindle-clip
```

## Step 3: Configure kindle-clip (Optional but Recommended)

Set a default path to your Kindle clippings file:

```bash
# If your Kindle is mounted
kindle-clip set /Volumes/Kindle

# If you have the clippings file locally
kindle-clip set ~/Documents/Kindle/My\ Clippings.txt

# If you sync Kindle to a specific folder
kindle-clip set ~/Dropbox/Kindle
```

This saves the path to `~/.config/kindle-clip/config.json` so you don't need to specify it in every command.

## Step 4: Verify Installation

Test that everything works:

```bash
# Should show help text
kindle-clip --help

# If you set a default path, this should list your books
kindle-clip list
```

## Troubleshooting

### "command not found: kindle-clip"

The binary is not in your PATH. Either:
1. Add the installation directory to your PATH (see Option A above)
2. Use the full path: `~/.local/bin/kindle-clip` or `/usr/local/bin/kindle-clip`

### "Permission denied"

The binary doesn't have execute permissions:
```bash
chmod +x /path/to/kindle-clip
```

### "no clippings path provided"

You haven't set a default path. Either:
1. Run `kindle-clip set <path>` to save a default
2. Provide the path in each command: `kindle-clip list /path/to/clippings.txt`
3. Set the environment variable: `export KINDLE_CLIP_PATH=/path/to/clippings.txt`

### "no such file or directory"

The clippings file doesn't exist at the specified path. Check:
1. Is your Kindle mounted? (Usually at `/Volumes/Kindle` on macOS)
2. Does the file exist? `ls ~/Documents/Kindle/My\ Clippings.txt`
3. Is the path correct? Use the full absolute path

## Finding Your Kindle Clippings File

### On macOS

When Kindle is connected via USB:
```
/Volumes/Kindle/documents/My Clippings.txt
```

### On Windows

When Kindle is connected via USB:
```
E:\documents\My Clippings.txt
```
(Replace E: with your Kindle drive letter)

### On Linux

When Kindle is mounted:
```
/media/username/Kindle/documents/My Clippings.txt
```

### Via Kindle for Mac/PC App

The Kindle desktop app doesn't export to "My Clippings.txt" format. You need to:
1. Connect your physical Kindle device via USB, OR
2. Export highlights manually from the Amazon website

## Updating the Binary

To update to a newer version, follow the same installation process:

1. Download the latest release from GitHub Releases
2. Verify the checksum (recommended)
3. Extract and replace the existing binary
4. Verify the new version: `kindle-clip --version`

## Uninstallation

To remove kindle-clip:

```bash
# Remove binary
rm ~/.local/bin/kindle-clip
# or
sudo rm /usr/local/bin/kindle-clip

# Remove config (optional)
rm -rf ~/.config/kindle-clip
```

To remove the OpenClaw skill:

```bash
rm -rf /path/to/openclaw/skills/kindle-clip
```

## Next Steps

After installation:

1. Read SKILL.md for complete command reference
2. Check EXAMPLES.md for practical usage examples
3. Set up your default clippings path with `kindle-clip set <path>`
4. Start using AI agents to explore your Kindle highlights!

## Support

For issues:
- Check the [GitHub Issues](https://github.com/emersonding/kindle-clip-processor/issues)
- Review the [README](https://github.com/emersonding/kindle-clip-processor/blob/master/README.md)
- Consult the troubleshooting section above

## Version Compatibility

This skill is compatible with:
- kindle-clip binary v1.0.0 and later
- OpenClaw and OpenClaw-compatible agents
- Go 1.21 or later (if building from source)
