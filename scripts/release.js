#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const DOCKERFILE_PATH = path.join(__dirname, '..', 'docker', 'Dockerfile');

class ReleaseManager {
  constructor() {
    this.packageJson = null;
    this.currentVersion = null;
    this.newVersion = null;
    this.releaseType = null;
  }

  async init() {
    try {
      const packageJsonContent = await fs.promises.readFile(PACKAGE_JSON_PATH, 'utf8');
      this.packageJson = JSON.parse(packageJsonContent);
      this.currentVersion = this.packageJson.version;
      console.log(chalk.blue(`Current version: ${this.currentVersion}`));
    } catch (error) {
      console.error(chalk.red('Error reading package.json:', error.message));
      process.exit(1);
    }
  }

  parseArguments() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      this.showUsage();
      process.exit(1);
    }

    this.releaseType = args[0].toLowerCase();

    if (!['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(this.releaseType)) {
      console.error(chalk.red(`Invalid release type: ${this.releaseType}`));
      this.showUsage();
      process.exit(1);
    }

    // Check for dry-run flag
    this.dryRun = args.includes('--dry-run') || args.includes('-d');

    // Check for skip-tests flag
    this.skipTests = args.includes('--skip-tests') || args.includes('-s');

    // Check for force flag
    this.force = args.includes('--force') || args.includes('-f');
  }

  showUsage() {
    console.log(chalk.yellow(`
Release Script Usage:
  node scripts/release.js <type> [options]

Release Types:
  major     - 1.0.0 -> 2.0.0 (breaking changes)
  minor     - 1.0.0 -> 1.1.0 (new features)
  patch     - 1.0.0 -> 1.0.1 (bug fixes)
  premajor  - 1.0.0 -> 2.0.0-0 (pre-release for major)
  preminor  - 1.0.0 -> 1.1.0-0 (pre-release for minor)
  prepatch  - 1.0.0 -> 1.0.1-0 (pre-release for patch)
  prerelease - 1.0.0 -> 1.0.1-0 (pre-release for current)

Options:
  --dry-run, -d    - Show what would be done without making changes
  --skip-tests, -s - Skip running tests before release
  --force, -f      - Force release even if tests fail or working directory is dirty

Examples:
  node scripts/release.js patch
  node scripts/release.js minor --dry-run
  node scripts/release.js major --skip-tests
  node scripts/release.js prerelease --force
`));
  }

  calculateNewVersion() {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);

    switch (this.releaseType) {
    case 'major':
      this.newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      this.newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      this.newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    case 'premajor':
      this.newVersion = `${major + 1}.0.0-0`;
      break;
    case 'preminor':
      this.newVersion = `${major}.${minor + 1}.0-0`;
      break;
    case 'prepatch':
      this.newVersion = `${major}.${minor}.${patch + 1}-0`;
      break;
    case 'prerelease':
      if (this.currentVersion.includes('-')) {
        const [baseVersion, prerelease] = this.currentVersion.split('-');
        const prereleaseNum = parseInt(prerelease) || 0;
        this.newVersion = `${baseVersion}-${prereleaseNum + 1}`;
      } else {
        this.newVersion = `${major}.${minor}.${patch + 1}-0`;
      }
      break;
    }

    console.log(chalk.green(`New version: ${this.newVersion}`));
  }

  checkWorkingDirectory() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim() && !this.force) {
        console.error(chalk.red('Working directory is not clean. Please commit or stash your changes.'));
        console.error(chalk.yellow('Use --force to override this check.'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error checking git status:', error.message));
      process.exit(1);
    }
  }

  async runTests() {
    if (this.skipTests) {
      console.log(chalk.yellow('Skipping tests (--skip-tests flag used)'));
      return;
    }

    console.log(chalk.blue('Running tests...'));

    try {
      // Run npm tests
      execSync('npm test', { stdio: 'inherit' });
      console.log(chalk.green('✓ Tests passed'));
    } catch (error) {
      if (!this.force) {
        console.error(chalk.red('✗ Tests failed'));
        console.error(chalk.yellow('Use --force to override this check.'));
        process.exit(1);
      } else {
        console.log(chalk.yellow('Tests failed, but continuing due to --force flag'));
      }
    }
  }

  async updatePackageJson() {
    console.log(chalk.blue('Updating package.json...'));

    this.packageJson.version = this.newVersion;

    if (this.dryRun) {
      console.log(chalk.yellow(`[DRY RUN] Would update package.json version to ${this.newVersion}`));
    } else {
      await fs.promises.writeFile(PACKAGE_JSON_PATH, JSON.stringify(this.packageJson, null, 2) + '\n');
      console.log(chalk.green(`✓ Updated package.json to version ${this.newVersion}`));
    }
  }

  async updateDockerfile() {
    console.log(chalk.blue('Updating Dockerfile labels...'));

    try {
      let dockerfileContent = await fs.promises.readFile(DOCKERFILE_PATH, 'utf8');

      // Update version label
      dockerfileContent = dockerfileContent.replace(
        /LABEL org\.opencontainers\.image\.version=.*/,
        `LABEL org.opencontainers.image.version=${this.newVersion}`
      );

      if (this.dryRun) {
        console.log(chalk.yellow(`[DRY RUN] Would update Dockerfile version label to ${this.newVersion}`));
      } else {
        await fs.promises.writeFile(DOCKERFILE_PATH, dockerfileContent);
        console.log(chalk.green(`✓ Updated Dockerfile version label to ${this.newVersion}`));
      }
    } catch (error) {
      console.error(chalk.red('Error updating Dockerfile:', error.message));
      if (!this.force) {process.exit(1);}
    }
  }

  async commitChanges() {
    if (this.dryRun) {
      console.log(chalk.yellow('[DRY RUN] Would commit changes'));
      return;
    }

    console.log(chalk.blue('Committing changes...'));

    try {
      execSync('git add package.json docker/Dockerfile', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${this.newVersion}"`, { stdio: 'inherit' });
      console.log(chalk.green('✓ Changes committed'));
    } catch (error) {
      console.error(chalk.red('Error committing changes:', error.message));
      process.exit(1);
    }
  }

  async createTag() {
    const tagName = `v${this.newVersion}`;

    if (this.dryRun) {
      console.log(chalk.yellow(`[DRY RUN] Would create tag: ${tagName}`));
      return;
    }

    console.log(chalk.blue(`Creating tag: ${tagName}`));

    try {
      execSync(`git tag ${tagName}`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ Created tag: ${tagName}`));
    } catch (error) {
      console.error(chalk.red('Error creating tag:', error.message));
      process.exit(1);
    }
  }

  async pushChanges() {
    if (this.dryRun) {
      console.log(chalk.yellow('[DRY RUN] Would push changes and tags'));
      return;
    }

    console.log(chalk.blue('Pushing changes and tags...'));

    try {
      execSync('git push origin main', { stdio: 'inherit' });
      execSync('git push origin --tags', { stdio: 'inherit' });
      console.log(chalk.green('✓ Changes and tags pushed'));
    } catch (error) {
      console.error(chalk.red('Error pushing changes:', error.message));
      process.exit(1);
    }
  }

  showNextSteps() {
    console.log(chalk.blue('\n🎉 Release completed successfully!'));
    console.log(chalk.green(`Version: ${this.newVersion}`));
    console.log(chalk.green(`Tag: v${this.newVersion}`));

    if (!this.dryRun) {
      console.log(chalk.yellow('\nNext steps:'));
      console.log(chalk.yellow('1. GitHub Actions will automatically build and publish the new version'));
      console.log(chalk.yellow('2. Monitor the CI/CD pipeline in the Actions tab'));
      console.log(chalk.yellow('3. Create a GitHub release with release notes'));
      console.log(chalk.yellow('4. Update documentation if needed'));
    } else {
      console.log(chalk.yellow('\nThis was a dry run. No changes were made.'));
    }
  }

  async run() {
    try {
      await this.init();
      this.parseArguments();
      this.calculateNewVersion();

      console.log(chalk.blue(`\n🚀 Starting ${this.releaseType} release...`));
      console.log(chalk.blue(`Current version: ${this.currentVersion}`));
      console.log(chalk.blue(`New version: ${this.newVersion}`));

      if (this.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN MODE] - No changes will be made'));
      }

      this.checkWorkingDirectory();
      await this.runTests();
      await this.updatePackageJson();
      await this.updateDockerfile();
      await this.commitChanges();
      await this.createTag();
      await this.pushChanges();
      this.showNextSteps();

    } catch (error) {
      console.error(chalk.red('Release failed:', error.message));
      process.exit(1);
    }
  }
}

// Run the release manager
const releaseManager = new ReleaseManager();
releaseManager.run();
