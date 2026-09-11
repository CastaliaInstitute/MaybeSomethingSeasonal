const fs = require('fs');
const path = require('path');

const ICS_PATH = path.join(__dirname, '..', 'public', 'MSS.ics');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const BASE_PATH = 'https://mss.castalia.institute';

function fixMissingImages() {
  console.log('🔧 Fixing missing image references...\n');
  
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
  let inEvent = false;
  let currentEvent = {};
  let fixed = 0;
  let removed = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT' && inEvent) {
      // Check if event has an invalid image reference
      if (currentEvent.hasImage && currentEvent.imagePath) {
        const filename = currentEvent.imagePath.split('/').pop();
        if (!availableImages.has(filename)) {
          // Remove the invalid X-IMAGE line
          console.log(`❌ Removing invalid image reference: ${filename}`);
          console.log(`   Event: ${currentEvent.description ? currentEvent.description.split('\\n')[0].substring(0, 60) : 'Unknown'}`);
          removed++;
          // Don't add the X-IMAGE line
        } else {
          // Keep valid image
          updatedLines.push(`X-IMAGE:${currentEvent.imagePath}`);
        }
      }
      updatedLines.push(line);
      inEvent = false;
      currentEvent = {};
    } else if (inEvent && trimmed.startsWith('DESCRIPTION:')) {
      currentEvent.description = trimmed.replace('DESCRIPTION:', '').trim();
      updatedLines.push(line);
    } else if (inEvent && trimmed.startsWith('X-IMAGE:')) {
      currentEvent.hasImage = true;
      currentEvent.imagePath = trimmed.replace('X-IMAGE:', '').trim();
      // Don't add this line yet - we'll check if the file exists
    } else {
      updatedLines.push(line);
    }
  }
  
  // Write updated file
  fs.writeFileSync(ICS_PATH, updatedLines.join('\n'));
  
  console.log(`\n✅ Fixed missing image references`);
  console.log(`   Removed ${removed} invalid image references`);
  console.log(`📝 ICS file saved: ${ICS_PATH}\n`);
}

if (require.main === module) {
  fixMissingImages();
}

module.exports = { fixMissingImages };
