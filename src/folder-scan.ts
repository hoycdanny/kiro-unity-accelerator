import * as path from 'path';

/**
 * Set of supported asset file extensions (lowercase, with leading dot).
 */
const SUPPORTED_EXTENSIONS = new Set([
  // 3D Models
  '.fbx', '.obj', '.dae', '.3ds', '.blend',
  // Textures
  '.png', '.jpg', '.jpeg', '.tga', '.psd', '.tiff', '.bmp', '.gif', '.exr', '.hdr',
  // Audio
  '.wav', '.mp3', '.ogg', '.aiff', '.flac',
  // Materials & Shaders
  '.mat', '.shader', '.shadergraph', '.cginc', '.hlsl',
  // Animation
  '.anim', '.controller',
  // Other Unity assets
  '.prefab', '.asset', '.unity',
]);

/**
 * Filter a list of file paths, keeping only those with a supported asset extension.
 */
export function filterSupportedAssets(filePaths: string[]): string[] {
  return filePaths.filter((fp) => {
    const ext = path.extname(fp).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  });
}

/**
 * Returns the set of supported extensions (for testing / introspection).
 */
export function getSupportedExtensions(): ReadonlySet<string> {
  return SUPPORTED_EXTENSIONS;
}
