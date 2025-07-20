import { Octokit } from '@octokit/rest'
import crypto from 'crypto'

class GitHubImageStorage {
  private owner?: string
  private repo?: string
  private branch: string = 'main'
  private octokit?: Octokit
  private initialized = false

  private initialize() {
    if (this.initialized) return

    // Parse GITHUB_REPO environment variable (format: "owner/repo")
    const repoPath = process.env.GITHUB_REPO || 'daveenci-ai/daveenci-ai-avatar-images'
    const [owner, repo] = repoPath.split('/')
    
    if (!owner || !repo) {
      throw new Error('Invalid GITHUB_REPO format. Expected: "owner/repository"')
    }
    
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required for GitHub API authentication')
    }
    
    this.owner = owner
    this.repo = repo
    
    // Initialize GitHub API client with Personal Access Token
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    this.initialized = true
  }

  /**
   * Download image from URL and return base64 encoded content
   */
  async downloadImage(imageUrl: string): Promise<string> {
    this.initialize()
    
    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer).toString('base64')
    } catch (error: any) {
      console.error('Error downloading image:', error)
      throw new Error(`Failed to download image: ${error.message}`)
    }
  }

  /**
   * Generate a unique filename for the image
   */
  generateFilename(prompt: string, avatarName: string, extension: string = 'jpg'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const promptHash = crypto.createHash('md5').update(prompt).digest('hex').substring(0, 8)
    const safeAvatarName = avatarName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const randomSuffix = crypto.randomBytes(4).toString('hex') // Add random suffix to ensure uniqueness
    
    return `${timestamp}_${safeAvatarName}_${promptHash}_${randomSuffix}.${extension}`
  }

  /**
   * Check if file exists and get its SHA
   */
  async getFileInfo(path: string): Promise<{ exists: boolean; sha: string | null }> {
    this.initialize()
    
    try {
      const response = await this.octokit!.repos.getContent({
        owner: this.owner!,
        repo: this.repo!,
        path: path,
        ref: this.branch
      })
      
      return {
        exists: true,
        sha: Array.isArray(response.data) ? null : response.data.sha
      }
    } catch (error: any) {
      if (error.status === 404) {
        return { exists: false, sha: null }
      }
      throw error
    }
  }

  /**
   * Upload image to GitHub repository with proper conflict handling
   */
  async uploadImageWithRetry(path: string, content: string, message: string, maxRetries: number = 3): Promise<void> {
    this.initialize()
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${maxRetries} for: ${path}`)
        
        // Get current file info
        const fileInfo = await this.getFileInfo(path)
        
        const uploadParams: any = {
          owner: this.owner!,
          repo: this.repo!,
          path: path,
          message: message,
          content: content,
          branch: this.branch
        }
        
        // If file exists, include its SHA for update
        if (fileInfo.exists && fileInfo.sha) {
          uploadParams.sha = fileInfo.sha
          console.log(`📝 File exists, updating with SHA: ${fileInfo.sha}`)
        } else {
          console.log(`📝 Creating new file: ${path}`)
        }
        
        // Upload to GitHub
        await this.octokit!.repos.createOrUpdateFileContents(uploadParams)
        
        console.log(`✅ Upload successful on attempt ${attempt}`)
        return // Success, exit retry loop
        
      } catch (error: any) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error.message)
        
        if (attempt === maxRetries) {
          throw error // Final attempt failed
        }
        
        // Check if it's a conflict error
        if (error.message && error.message.includes('but expected')) {
          console.log(`🔄 Conflict detected, retrying in ${attempt * 1000}ms...`)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)) // Exponential backoff
          continue
        }
        
        // For other errors, don't retry
        throw error
      }
    }
  }

  /**
   * Upload image to GitHub repository
   */
  async uploadImage(imageUrl: string, prompt: string, avatarName: string): Promise<{ url: string }> {
    this.initialize()
    
    try {
      console.log('📸 Downloading image from Replicate...')
      const imageBase64 = await this.downloadImage(imageUrl)
      
      // Generate unique filename
      const filename = this.generateFilename(prompt, avatarName)
      
      // Create avatar-specific folder path
      const safeAvatarName = avatarName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const path = `avatars/${safeAvatarName}/${filename}`
      
      console.log(`📤 Uploading image to GitHub: ${path}`)
      
      // Upload with retry logic
      await this.uploadImageWithRetry(
        path,
        imageBase64,
        `Add generated image: ${avatarName} - ${prompt.substring(0, 50)}...`
      )

      // Generate the raw GitHub URL
      const githubUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`
      
      console.log(`✅ Image uploaded successfully: ${githubUrl}`)
      
      return {
        url: githubUrl
      }
      
    } catch (error: any) {
      console.error('Error uploading image to GitHub:', error)
      throw new Error(`Failed to upload image to GitHub: ${error.message}`)
    }
  }

  /**
   * Test GitHub connection
   */
  async testConnection(): Promise<boolean> {
    this.initialize()
    
    try {
      const response = await this.octokit!.repos.get({
        owner: this.owner!,
        repo: this.repo!
      })
      
      console.log(`✅ GitHub connection successful: ${response.data.full_name}`)
      return true
    } catch (error: any) {
      console.error('GitHub connection test failed:', error)
      throw new Error(`GitHub connection failed: ${error.message}`)
    }
  }
}

export default new GitHubImageStorage() 