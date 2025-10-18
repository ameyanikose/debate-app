# Auto-Run Multi-Agent Debate

A React TypeScript application that simulates live debates between configurable personas. The app features an auto-running debate system where different personas take turns discussing various topics.

## Features

- **Auto-running debates** with configurable personas and topics
- **Real-time transcript** with chat bubble interface
- **Persona management** - create, edit, and customize debate participants
- **Topic management** - add, edit, and organize discussion topics
- **Settings panel** - configure rounds, delays, and behavior
- **External LLM support** - integrate with OpenAI, Anthropic, or OpenRouter APIs
- **Export functionality** - copy or download debate transcripts
- **Responsive design** - works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Lucide React** for icons
- **shadcn/ui** component library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd debate-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Deployment

### Netlify

The project is configured for easy deployment on Netlify:

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Deploy!

The `netlify.toml` file is already configured for automatic deployment.

## Usage

### Basic Usage

1. **Start a debate**: Click the "Start" button to begin an auto-running debate
2. **Configure personas**: Use the "Personas" button to add, edit, or remove debate participants
3. **Set topics**: Use the "Topics" button to manage discussion topics
4. **Adjust settings**: Use the "Settings" button to configure rounds, delays, and other options
5. **Export transcripts**: Use "Copy transcript" or "Download .txt" to save debate content

### Advanced Features

- **External LLM Integration**: Enable external API usage in settings to use OpenAI, Anthropic, or OpenRouter for more sophisticated responses
- **Custom Personas**: Create detailed personas with names, roles, ages, colors, bios, and stances
- **Topic Management**: Import topics in bulk or edit them individually
- **Auto-run**: Configure the app to start debates automatically when loaded

## Project Structure

```
src/
├── components/
│   └── ui/           # shadcn/ui components
├── lib/
│   └── utils.ts      # Utility functions
├── App.tsx           # Main application component
├── index.css         # Global styles with Tailwind
└── main.tsx          # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).