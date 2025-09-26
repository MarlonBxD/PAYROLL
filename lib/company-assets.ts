export interface CompanyAssets {
  logo: string
  signature: string
  logoExists: boolean
  signatureExists: boolean
}

/**
 * Get company assets paths and check if they exist (server-side only)
 */
export async function getCompanyAssets(): Promise<CompanyAssets> {
  // Define asset paths
  const logoPath = '/company-assets/logo.png'
  const signaturePath = '/company-assets/signature.png'
  
  // Define fallback paths
  const fallbackLogoPath = '/placeholders/default-logo.png'
  const fallbackSignaturePath = '/placeholders/default-signature.png'
  
  // On server side, check if files exist
  let logoExists = false
  let signatureExists = false
  
  if (typeof window === 'undefined') {
    // Server-side: check file existence
    try {
      const { existsSync } = await import('fs')
      const { join } = await import('path')
      const publicDir = join(process.cwd(), 'public')
      
      logoExists = existsSync(join(publicDir, logoPath))
      signatureExists = existsSync(join(publicDir, signaturePath))
    } catch (error) {
      console.warn('Error checking asset existence:', error)
      // Fallback: assume files don't exist
      logoExists = false
      signatureExists = false
    }
  } else {
    // Client-side: try to fetch the files to check existence
    try {
      const logoResponse = await fetch(logoPath, { method: 'HEAD' })
      logoExists = logoResponse.ok
    } catch {
      logoExists = false
    }
    
    try {
      const signatureResponse = await fetch(signaturePath, { method: 'HEAD' })
      signatureExists = signatureResponse.ok
    } catch {
      signatureExists = false
    }
  }
  
  return {
    logo: logoExists ? logoPath : fallbackLogoPath,
    signature: signatureExists ? signaturePath : fallbackSignaturePath,
    logoExists,
    signatureExists
  }
}

/**
 * Get company assets synchronously for client-side (returns default paths)
 */
export function getCompanyAssetsSync(): CompanyAssets {
  return {
    logo: '/company-assets/logo.png',
    signature: '/company-assets/signature.png',
    logoExists: false, // Will be determined later
    signatureExists: false // Will be determined later
  }
}

/**
 * Check if a specific asset exists (server-side only)
 */
export async function checkAssetExists(assetPath: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    try {
      const { existsSync } = await import('fs')
      const { join } = await import('path')
      const publicDir = join(process.cwd(), 'public')
      return existsSync(join(publicDir, assetPath))
    } catch (error) {
      console.warn('Error checking asset existence:', error)
      return false
    }
  } else {
    // Client-side: try to fetch the file
    try {
      const response = await fetch(assetPath, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Get asset path for PDF generation (server-side)
 */
export async function getAssetPathForPDF(assetType: 'logo' | 'signature'): Promise<string> {
  const assets = await getCompanyAssets()
  const assetPath = assetType === 'logo' ? assets.logo : assets.signature
  
  // Return full file system path for PDF generation
  if (typeof window === 'undefined') {
    const { join } = await import('path')
    const publicDir = join(process.cwd(), 'public')
    return join(publicDir, assetPath)
  }
  
  return assetPath
}

/**
 * Get asset URL for web display
 */
export async function getAssetURL(assetType: 'logo' | 'signature'): Promise<string> {
  const assets = await getCompanyAssets()
  return assetType === 'logo' ? assets.logo : assets.signature
}

/**
 * Get company assets status for configuration display (sync version for client)
 */
export function getAssetsStatusSync() {
  return {
    logo: {
      exists: false, // Will be determined by component
      path: '/company-assets/logo.png',
      status: 'Verificando...'
    },
    signature: {
      exists: false, // Will be determined by component
      path: '/company-assets/signature.png',
      status: 'Verificando...'
    }
  }
}

/**
 * Get company assets status for configuration display (async version)
 */
export async function getAssetsStatus() {
  const assets = await getCompanyAssets()
  
  return {
    logo: {
      exists: assets.logoExists,
      path: assets.logo,
      status: assets.logoExists ? 'Configurado' : 'Usando por defecto'
    },
    signature: {
      exists: assets.signatureExists,
      path: assets.signature,
      status: assets.signatureExists ? 'Configurado' : 'Usando por defecto'
    }
  }
}