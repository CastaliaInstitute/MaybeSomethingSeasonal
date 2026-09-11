const fs = require('fs');
const path = require('path');

const ICS_PATH = path.join(__dirname, '..', 'public', 'MSS.ics');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const BASE_PATH = 'https://castaliainstitute.github.io/MaybeSomethingSeasonal';

// Mapping of missing image filenames to existing generic images
// These are the images that were generated but don't exist as files
// Using available generic images: image21.jpg, image22.jpg, image23.jpg, image24.jpg, image26.jpg, image27.jpg, image28.jpg, image29.jpg, image30.jpg, image31.jpg, image33.jpg
const MISSING_TO_EXISTING = {
  'dia-de-los-angelitos-honoring-deceased-children.jpg': 'image22.jpg',
  'dia-de-los-muertos-celebration-of-deceased-loved-ones.jpg': 'image21.jpg', // Use available generic
  'evening-before-st-martins-day-traditional-celebration.jpg': 'image23.jpg',
  'feast-of-st-martin-of-tours-patron-of-soldiers-and-beggars.jpg': 'image24.jpg',
  'gratitude-for-the-harvest-and-blessings-of-the-year.jpg': 'image26.jpg',
  'eve-of-st-andrews-day-traditional-celebration.jpg': 'image27.jpg',
  'first-sunday-of-advent-the-beginning-of-the-liturgical-year-and-preparation-for-christmas.jpg': 'image28.jpg',
  'krampus-night-the-dark-companion-of-st-nicholas.jpg': 'image29.jpg',
  'feast-of-st-nicholas-bishop-and-patron-saint-of-children-and-gift-giving.jpg': 'image30.jpg',
  'second-sunday-of-advent-preparation-and-anticipation.jpg': 'image31.jpg',
  'vigil-of-the-nativity-anticipation-of-christs-birth.jpg': 'image33.jpg',
  'birth-of-jesus-christ-joy-and-celebration.jpg': 'image21.jpg', // Reuse
  'feast-of-the-holy-innocents-also-known-as-childermas.jpg': 'image22.jpg', // Reuse
};

function fixMissingImageFiles() {
  console.log('🔧 Fixing missing image file references...\n');
  
  // Get all available images
  const availableImages = new Set();
  if (fs.existsSync(IMAGES_DIR)) {
    fs.readdirSync(IMAGES_DIR)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
      .forEach(f => availableImages.add(f));
  }
  
  console.log(`📁 Found ${availableImages.size} images in ${IMAGES_DIR}\n`);
  
  // Read ICS file
  const content = fs.readFileSync(ICS_PATH, 'utf8');
  const lines = content.split('\n');
  
  const updatedLines = [];
  let updates = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('X-IMAGE:')) {
      const imagePath = trimmed.replace('X-IMAGE:', '').trim();
      const filename = imagePath.split('/').pop();
      
      // Check if this is a missing image
      if (MISSING_TO_EXISTING[filename]) {
        const replacement = MISSING_TO_EXISTING[filename];
        
        // Check if replacement exists
        if (availableImages.has(replacement)) {
          const newPath = `${BASE_PATH}/images/${replacement}`;
          updatedLines.push(`X-IMAGE:${newPath}`);
          updates++;
          console.log(`✅ Updated: ${filename} -> ${replacement}`);
        } else {
          // Replacement doesn't exist, try to find any generic image
          const genericImages = Array.from(availableImages).filter(f => /^image\d+\./.test(f));
          if (genericImages.length > 0) {
            const fallback = genericImages[0];
            const newPath = `${BASE_PATH}/images/${fallback}`;
            updatedLines.push(`X-IMAGE:${newPath}`);
            updates++;
            console.log(`⚠️  Using fallback: ${filename} -> ${fallback}`);
          } else {
            // Keep original if no replacement found
            updatedLines.push(line);
            console.log(`❌ No replacement found for: ${filename}`);
          }
        }
      } else if (!availableImages.has(filename)) {
        // Image doesn't exist and isn't in our mapping - try to find a generic image
        const genericImages = Array.from(availableImages).filter(f => /^image\d+\./.test(f));
        if (genericImages.length > 0) {
          const fallback = genericImages[0];
          const newPath = `${BASE_PATH}/images/${fallback}`;
          updatedLines.push(`X-IMAGE:${newPath}`);
          updates++;
          console.log(`⚠️  Using fallback for missing: ${filename} -> ${fallback}`);
        } else {
          updatedLines.push(line);
        }
      } else {
        // Image exists, keep as is
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }
  
  // Write updated file
  fs.writeFileSync(ICS_PATH, updatedLines.join('\n'));
  
  console.log(`\n✅ Fixed ${updates} image references`);
  console.log(`📝 ICS file saved: ${ICS_PATH}\n`);
}

if (require.main === module) {
  fixMissingImageFiles();
}

module.exports = { fixMissingImageFiles };
