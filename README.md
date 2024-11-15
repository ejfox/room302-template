# Introduction to room302.studio template setup script
This wizard sets up a development environment for a project, including checks for necessary tools and installation prompts. The focus is on quickly going from idea to publishable project.

## Process Flow

### 1. Environment Checks
- **Node.js Version Check**: 
  - Executes `node -v` to get the current Node.js version.
  - If the version is less than 18.0, it displays a warning message.

- **Tool Availability Checks**:
  - **Supabase CLI**: Checks if Supabase CLI is installed. If not, displays an installation guide.
  - **GitHub CLI**: Checks for GitHub CLI installation. If missing, suggests installation steps.
  - **Docker (Optional)**: Checks for Docker if initializing a Supabase project.

### 2. User Input
- Prompts the user for various project settings including:
  - Project name
  - Use of OpenAI, @nuxt/ui, Nuxt Content
  - Initialization of Supabase project
  - Netlify setup, GitHub for environment setup
  - Repository visibility
  - Project license

### 3. Project Initialization
- **Supabase Project Initialization**: 
  - Checks for Docker.
  - Initializes a Supabase project if requested.

- **Clone Template Repository**:
  - Clones a specific GitHub repository as a template for the new project.

### 4. Project Configuration
- **Conditional File Deletion**: Deletes `useOpenAi.js` if OpenAI is not needed.
- **Package.json Update**: Modifies the project's `package.json` to reflect chosen configurations.

### 5. Finalization
- Installs NPM packages.
- Performs additional configurations and setups based on user input.

## Conclusion
The script automates the process of setting up a new project environment, ensuring all necessary tools and configurations are in place.

## Template Repository

This CLI uses [room302studio/nuxt-template](https://github.com/room302studio/nuxt-template) as its base template. The template includes:

- Nuxt 3 setup with TypeScript
- @nuxt/ui (optional)
- Tailwind CSS configuration
- Basic project structure
- GitHub Actions setup
- Essential configuration files

You can view the template repository [here](https://github.com/room302studio/nuxt-template).
