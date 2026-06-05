# Installation

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0 (recommended) or npm

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/openio.git
cd openio

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link CLI globally
cd apps/cli
npm link
```

## Development

```bash
# Run CLI in development mode
pnpm dev

# Or use tsx directly
npx tsx apps/cli/src/index.ts chat
```

## Docker

```bash
# Build Docker image
docker build -t openio .

# Run
docker run -it --rm -v $HOME/.openio:/root/.openio openio
```

## Platform-Specific Notes

### Windows
- Use Git Bash or PowerShell
- For SQLite support, install Visual Studio Build Tools if using better-sqlite3
- The default SQLite driver (sql.js) works without native compilation

### macOS
- No additional setup required

### Linux
- Install build-essential for native modules
- `apt-get install build-essential python3`
