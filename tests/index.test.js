const inquirer = require('inquirer');
const fs = require('fs');

// Mock modules before requiring the file under test
jest.mock('inquirer');
jest.mock('fs');
jest.mock('shelljs', () => ({
  exec: jest.fn(),
  echo: jest.fn(),
  which: jest.fn(),
  cd: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn(),
  ls: jest.fn(),
  pwd: jest.fn()
}));

// Import shell after mocking it
const shell = require('shelljs');

// Require the functions after mocking
const {
  checkNodeVersion,
  checkSupabaseCLI,
  checkGitHubCLI,
  promptUser,
  cloneTemplateRepo,
  updatePackageJson,
  setupTailwind,
  updateNuxtConfig,
  initGitRepo,
  createGitHubRepo,
  commitAndPush,
  openInEditor,
  installDependencies,
  main
} = require('../index.js');

// At the top with other mocks
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('CLI Tool Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('Environment Checks', () => {
    test('checkNodeVersion should pass for Node >= 18.0', async () => {
      shell.exec.mockReturnValue({ stdout: 'v18.17.1', code: 0 });
      
      await checkNodeVersion();
      
      expect(shell.echo).not.toHaveBeenCalledWith(expect.stringContaining('Oops!'));
    });

    test('checkSupabaseCLI should warn if Supabase CLI is not installed', async () => {
      shell.which.mockReturnValue(null);
      
      await checkSupabaseCLI();
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Supabase CLI not found'));
    });
  });

  describe('User Input', () => {
    test('promptUser should return correct answers', async () => {
      const mockAnswers = {
        projectName: 'test-project',
        uiFramework: 'nuxt-ui',
        isRepoPublic: true,
        license: 'mit',
        githubOrg: 'personal',
        autoCommitPush: true,
      };
      
      inquirer.prompt.mockResolvedValue(mockAnswers);
      
      const answers = await promptUser();
      expect(answers).toEqual(mockAnswers);
    });
  });

  describe('Project Setup', () => {
    test('cloneTemplateRepo should handle successful clone', async () => {
      shell.exec.mockReturnValue({ code: 0 });
      const consoleSpy = jest.spyOn(shell, 'echo');
      
      await cloneTemplateRepo('test-project');
      
      expect(shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('gh repo clone'),
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully cloned'));
    });

    test('updateNuxtConfig should handle nuxt-ui framework correctly', async () => {
      // Mock file reading and writing
      const mockConfig = 'export default defineNuxtConfig({ modules: ["@nuxt/ui"] })';
      fs.readFileSync
        .mockReturnValueOnce(mockConfig)  // for nuxt.config.ts
        .mockReturnValueOnce('{"dependencies": {"@nuxt/ui": "^1.0.0"}}');  // for package.json
      
      await updateNuxtConfig('nuxt-ui');
      
      // We should still write the config back, even if unchanged
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'nuxt.config.ts',
        expect.stringContaining('@nuxt/ui')
      );
      expect(shell.echo).toHaveBeenCalledWith("✨ Keeping @nuxt/ui configuration...");
    });

    test('updateNuxtConfig should remove nuxt-ui for tailwind-only setup', async () => {
      // Mock file reading and writing
      fs.readFileSync
        .mockReturnValueOnce('export default defineNuxtConfig({ modules: ["@nuxt/ui"] })')  // for nuxt.config.ts
        .mockReturnValueOnce('{"dependencies": {"@nuxt/ui": "^1.0.0"}}');  // for package.json
      fs.existsSync.mockReturnValue(false);  // for setupTailwind checks
      
      await updateNuxtConfig('tailwind');
      
      expect(fs.writeFileSync).toHaveBeenCalled();
      // Config should not contain @nuxt/ui
      expect(fs.writeFileSync.mock.calls[0][1]).not.toContain('@nuxt/ui');
      expect(shell.echo).toHaveBeenCalledWith("🎭 Setting up lightweight Tailwind configuration...");
    });

    test('updateNuxtConfig should handle bare setup correctly', async () => {
      // Mock file reading and writing
      fs.readFileSync
        .mockReturnValueOnce('export default defineNuxtConfig({ modules: ["@nuxt/ui"] })')  // for nuxt.config.ts
        .mockReturnValueOnce('{"dependencies": {"@nuxt/ui": "^1.0.0"}}');  // for package.json
      
      await updateNuxtConfig('none');
      
      expect(fs.writeFileSync).toHaveBeenCalled();
      // Config should not contain @nuxt/ui
      expect(fs.writeFileSync.mock.calls[0][1]).not.toContain('@nuxt/ui');
      expect(shell.echo).toHaveBeenCalledWith("🧹 Removing UI frameworks for a clean slate...");
    });

    describe('Git Operations', () => {
      test('initGitRepo should initialize a new git repository', async () => {
        // Mock successful git commands
        shell.exec
          .mockReturnValueOnce({ code: 0 }) // rm -rf .git
          .mockReturnValueOnce({ code: 0 }); // git init
        
        await initGitRepo();
        
        expect(shell.exec).toHaveBeenCalledWith('rm -rf .git');
        expect(shell.exec).toHaveBeenCalledWith('git init');
        expect(shell.echo).toHaveBeenCalledWith('✅ Git repository initialized!');
      });

      test('initGitRepo should handle errors gracefully', async () => {
        // Mock failed git init
        shell.exec
          .mockReturnValueOnce({ code: 0 }) // rm -rf .git succeeds
          .mockReturnValueOnce({ code: 1 }); // git init fails
        
        await initGitRepo();
        
        expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Git init failed'));
      });

      test('createGitHubRepo should create personal repository correctly', async () => {
        shell.exec.mockReturnValue({ code: 0 });
        shell.pwd.mockReturnValue('/test/path');
        
        await createGitHubRepo('test-project', true, 'personal', null);
        
        expect(shell.exec).toHaveBeenCalledWith(
          expect.stringContaining('gh repo create test-project --public')
        );
        expect(shell.echo).toHaveBeenCalledWith('🏠 Creating in your personal GitHub account...');
      });

      test('createGitHubRepo should create organization repository correctly', async () => {
        shell.exec.mockReturnValue({ code: 0 });
        shell.pwd.mockReturnValue('/test/path');
        
        await createGitHubRepo('test-project', false, 'room302studio', null);
        
        expect(shell.exec).toHaveBeenCalledWith(
          expect.stringContaining('gh repo create room302studio/test-project --private')
        );
        expect(shell.echo).toHaveBeenCalledWith('🏢 Creating in Room302 Studio organization...');
      });
    });

    describe('Template Repository', () => {
      test('template repository should be accessible', async () => {
        // Mock successful API response for both repo check and clone
        shell.exec
          .mockReturnValueOnce({ 
            code: 0, 
            stdout: JSON.stringify({
              name: 'nuxt-template',
              html_url: 'https://github.com/room302studio/nuxt-template'
            })
          })
          .mockReturnValueOnce({ code: 0 }); // successful clone
        
        fs.existsSync.mockReturnValue(true); // mock all files exist
        
        await cloneTemplateRepo('test-project');
        
        expect(shell.exec).toHaveBeenCalledWith(
          'gh repo view room302studio/nuxt-template --json name,html_url',
          expect.any(Object)
        );
        expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Successfully cloned'));
      });

      test('cloneTemplateRepo should verify essential files exist after cloning', async () => {
        // Mock successful repo check and clone
        shell.exec
          .mockReturnValueOnce({ 
            code: 0, 
            stdout: JSON.stringify({
              name: 'nuxt-template',
              html_url: 'https://github.com/room302studio/nuxt-template'
            })
          })
          .mockReturnValueOnce({ code: 0 }); // successful clone
        
        // Mock file checks
        const essentialFiles = [
          'nuxt.config.ts',
          'package.json',
          'tailwind.config.js',
          'app.vue'
        ];

        fs.existsSync.mockImplementation((path) => essentialFiles.some(file => path.includes(file)));
        
        await cloneTemplateRepo('test-project');
        
        // Verify clone was attempted
        expect(shell.exec).toHaveBeenCalledWith(
          expect.stringContaining('gh repo clone room302studio/nuxt-template'),
          expect.any(Object)
        );

        // Verify file checks
        essentialFiles.forEach(file => {
          expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining(file));
        });
      });

      test('cloneTemplateRepo should fail if essential files are missing', async () => {
        // Mock successful repo check and clone but missing files
        shell.exec
          .mockReturnValueOnce({ 
            code: 0, 
            stdout: JSON.stringify({
              name: 'nuxt-template',
              html_url: 'https://github.com/room302studio/nuxt-template'
            })
          })
          .mockReturnValueOnce({ code: 0 }); // successful clone
        
        fs.existsSync.mockReturnValue(false);
        
        await cloneTemplateRepo('test-project');
        
        expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('missing essential files'));
        expect(process.exit).toHaveBeenCalledWith(1);
      });

      test('cloneTemplateRepo should handle inaccessible template repository', async () => {
        shell.exec
          .mockReturnValueOnce({ code: 1 }) // repo check fails
          .mockReturnValueOnce({ code: 0 }); // clone would succeed (but shouldn't get here)
        
        await cloneTemplateRepo('test-project');
        
        expect(shell.echo).toHaveBeenCalledWith(
          expect.stringContaining('Template repository not accessible')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Tailwind Setup', () => {
    test('setupTailwind should handle existing configuration', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('module.exports = { plugins: ["@nuxt/ui"] }');
      
      await setupTailwind();
      
      expect(fs.writeFileSync).toHaveBeenCalled();
      // Should remove @nuxt/ui references
      expect(fs.writeFileSync.mock.calls[0][1]).not.toContain('@nuxt/ui');
    });

    test('setupTailwind should create new configuration if none exists', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await setupTailwind();
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'tailwind.config.js',
        expect.stringContaining('content:')
      );
    });
  });

  describe('Error Handling', () => {
    test('checkNodeVersion should handle errors gracefully', async () => {
      const mockError = new Error('Mock error');
      shell.exec.mockImplementation(() => { throw mockError; });
      
      await checkNodeVersion();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while checking Node.js version:",
        mockError
      );
    });

    test('checkSupabaseCLI should handle errors gracefully', async () => {
      const mockError = new Error('Mock error');
      shell.which.mockImplementation(() => { throw mockError; });
      
      await checkSupabaseCLI();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while checking Supabase CLI:",
        mockError
      );
    });

    test('checkGitHubCLI should handle errors gracefully', async () => {
      const mockError = new Error('Mock error');
      shell.which.mockImplementation(() => { throw mockError; });
      
      await checkGitHubCLI();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while checking GitHub CLI:",
        mockError
      );
    });

    // Add tests for remaining error paths
    test('updatePackageJson should handle file read/write errors', async () => {
      fs.readFileSync.mockImplementation(() => { throw new Error('Mock error'); });
      
      await updatePackageJson('test-project', 'mit', true);
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while updating package.json:",
        expect.any(Error)
      );
    });

    test('setupTailwind should handle dependency installation errors', async () => {
      shell.exec.mockReturnValue({ code: 1 });
      
      await setupTailwind();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Failed to install Tailwind dependencies"
      );
    });

    test('createGitHubRepo should handle custom organization correctly', async () => {
      shell.exec.mockReturnValue({ code: 0 });
      shell.pwd.mockReturnValue('/test/path');
      
      await createGitHubRepo('test-project', true, 'other', 'custom-org');
      
      expect(shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create custom-org/test-project --public')
      );
      expect(shell.echo).toHaveBeenCalledWith('🏢 Creating in custom-org organization...');
    });

    test('createGitHubRepo should handle repository creation failure', async () => {
      shell.exec.mockReturnValue({ code: 1 });
      
      await createGitHubRepo('test-project', true, 'personal', null);
      
      expect(shell.echo).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create GitHub repository')
      );
    });
  });

  describe('Project Finalization', () => {
    test('commitAndPush should handle successful auto commit and push', async () => {
      shell.exec
        .mockReturnValueOnce({ code: 0 }) // git add
        .mockReturnValueOnce({ code: 0 }) // git commit
        .mockReturnValueOnce({ code: 0 }); // git push
      
      await commitAndPush(true);
      
      expect(shell.exec).toHaveBeenCalledWith('git add .');
      expect(shell.exec).toHaveBeenCalledWith(expect.stringContaining('git commit -m'));
      expect(shell.exec).toHaveBeenCalledWith('git push -u origin main');
      expect(shell.echo).toHaveBeenCalledWith('✅ Changes pushed to GitHub successfully!');
    });

    test('commitAndPush should handle git add failure', async () => {
      shell.exec.mockReturnValueOnce({ code: 1 }); // git add fails
      
      await commitAndPush(true);
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Git add failed'));
    });

    test('commitAndPush should handle git commit failure', async () => {
      shell.exec
        .mockReturnValueOnce({ code: 0 }) // git add
        .mockReturnValueOnce({ code: 1 }); // git commit fails
      
      await commitAndPush(true);
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Git commit failed'));
    });

    test('commitAndPush should handle git push failure', async () => {
      shell.exec
        .mockReturnValueOnce({ code: 0 }) // git add
        .mockReturnValueOnce({ code: 0 }) // git commit
        .mockReturnValueOnce({ code: 1 }); // git push fails
      
      await commitAndPush(true);
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('Git push failed'));
    });

    test('commitAndPush should do nothing when autoCommitPush is false', async () => {
      await commitAndPush(false);
      
      expect(shell.exec).not.toHaveBeenCalled();
    });

    test('openInEditor should handle successful VSCode opening', async () => {
      shell.exec.mockReturnValue({ code: 0 });
      
      await openInEditor();
      
      expect(shell.exec).toHaveBeenCalledWith('code .');
    });

    test('openInEditor should handle VSCode opening failure', async () => {
      shell.exec.mockReturnValue({ code: 1 });
      
      await openInEditor();
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('failed to open the repo in VSCode'));
    });

    test('installDependencies should handle successful installation', async () => {
      shell.exec.mockReturnValue({ code: 0 });
      
      await installDependencies();
      
      expect(shell.exec).toHaveBeenCalledWith('yarn install');
      expect(shell.echo).toHaveBeenCalledWith('✅ Dependencies installed successfully!');
    });

    test('installDependencies should handle installation failure', async () => {
      shell.exec.mockReturnValue({ code: 1 });
      
      await installDependencies();
      
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining('yarn install failed'));
    });
  });

  describe('Main Function', () => {
    test('main should execute all steps successfully', async () => {
      // Mock successful responses for all operations
      const mockAnswers = {
        projectName: 'test-project',
        uiFramework: 'nuxt-ui',
        isRepoPublic: true,
        license: 'mit',
        githubOrg: 'personal',
        autoCommitPush: true,
      };
      
      inquirer.prompt.mockResolvedValue(mockAnswers);
      shell.exec
        .mockReturnValueOnce({ code: 0, stdout: 'v18.0.0' }) // node version
        .mockReturnValueOnce({ code: 0 }) // repo check
        .mockReturnValueOnce({ code: 0 }) // clone
        .mockReturnValueOnce({ code: 0 }) // git commands
        .mockReturnValueOnce({ code: 0 }); // other commands
      
      shell.which.mockReturnValue('/usr/local/bin/gh');
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');
      
      await main();
      
      expect(shell.echo).toHaveBeenCalledWith("🚀 Starting project setup...");
      expect(shell.echo).toHaveBeenCalledWith(expect.stringContaining("All done!"));
    });

    test('main should handle errors in environment checks', async () => {
      const mockError = new Error('Mock error');
      shell.exec.mockImplementation(() => { throw mockError; });
      
      await main();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while checking Node.js version:",
        mockError
      );
    });
  });

  describe('Edge Cases', () => {
    test('updateNuxtConfig should handle malformed nuxt.config.ts', async () => {
      // Mock file reading to throw an error
      fs.readFileSync.mockImplementationOnce(() => { 
        throw new Error('Invalid config file');
      });
      
      await updateNuxtConfig('nuxt-ui');
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while updating nuxt.config.ts:",
        expect.any(Error)
      );
    });

    test('setupTailwind should handle missing directories gracefully', async () => {
      // Mock successful dependency installation
      shell.exec.mockReturnValue({ code: 0 });
      
      // Mock file system checks
      fs.existsSync
        .mockReturnValueOnce(true)  // tailwind.config.js exists
        .mockReturnValueOnce(true)  // postcss.config.js exists
        .mockReturnValueOnce(false) // assets/css/tailwind.css doesn't exist
        .mockReturnValueOnce(false); // assets/css directory doesn't exist
      
      fs.readFileSync.mockReturnValue('{}');
      
      await setupTailwind();
      
      // Verify directory creation
      expect(shell.mkdir).toHaveBeenCalledWith('-p', 'assets/css');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'assets/css/tailwind.css',
        expect.stringContaining('@tailwind')
      );
    });

    test('setupTailwind should handle directory creation failure', async () => {
      // Mock successful dependency installation
      shell.exec.mockReturnValue({ code: 0 });
      
      // Mock file system checks
      fs.existsSync.mockReturnValue(false);
      
      // Mock directory creation failure
      shell.mkdir.mockImplementation(() => { throw new Error('Mock error'); });
      
      await setupTailwind();
      
      expect(shell.echo).toHaveBeenCalledWith(
        "🚨 Error occurred while setting up Tailwind:",
        expect.any(Error)
      );
    });
  });
}); 