const fs = require('fs');
const path = require('path');

const ICS_PATH = path.join(__dirname, '..', 'public', 'MSS.ics');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const BASE_PATH = 'https://castaliainstitute.github.io/MaybeSomethingSeasonal'; // Base path for GitHub Pages

// Read ICS file
function updateImageLinks() {
  const content = fs.readFileSync(ICS_PATH, 'utf8');
  const lines = content.split('\n');
  
  // Get all available images
  const availableImages = new Set();
  if (fs.existsSync(IMAGES_DIR)) {
    fs.readdirSync(IMAGES_DIR)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
      .forEach(f => availableImages.add(f));
  }
  
  console.log(`Found ${availableImages.size} images in ${IMAGES_DIR}`);
  
  const updatedLines = [];
  let inEvent = false;
  let currentEvent = {};
  let eventsUpdated = 0;
  let eventsMissingImages = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = { startIndex: i };
    } else if (trimmed === 'END:VEVENT' && inEvent) {
      // Check if event has an image
      if (!currentEvent.hasImage && currentEvent.description) {
        // Try to generate filename from description
        const firstLine = currentEvent.description.split('\\n')[0].trim();
        const sanitized = firstLine
          .toLowerCase()
          .replace(/[^a-z0-9\s]+/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 100) + '.jpg';
        
        if (availableImages.has(sanitized)) {
          // Insert X-IMAGE before END:VEVENT
          updatedLines.push(`X-IMAGE:${BASE_PATH}/images/${sanitized}`);
          eventsUpdated++;
          console.log(`  Added image for: ${firstLine.substring(0, 50)}`);
        } else {
          eventsMissingImages.push({
            title: firstLine,
            suggested: sanitized
          });
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
      const imagePath = trimmed.replace('X-IMAGE:', '').trim();
      
      // Extract filename from path
      const filename = imagePath.split('/').pop();
      
      // Update path to include base path if needed
      if (!imagePath.startsWith('http') && !imagePath.startsWith(BASE_PATH)) {
        // Update to use base path
        const newPath = imagePath.startsWith('/images/') 
          ? `${BASE_PATH}${imagePath}`
          : `${BASE_PATH}/images/${filename}`;
        
        updatedLines.push(`X-IMAGE:${newPath}`);
        if (imagePath !== newPath) {
          eventsUpdated++;
          console.log(`  Updated: ${imagePath} -> ${newPath}`);
        }
      } else {
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }
  
  // Write updated ICS file
  fs.writeFileSync(ICS_PATH, updatedLines.join('\n'));
  
  console.log(`\n✅ Updated ${eventsUpdated} image links in ICS file`);
  
  if (eventsMissingImages.length > 0) {
    console.log(`\n⚠️  ${eventsMissingImages.length} events missing images:`);
    eventsMissingImages.slice(0, 10).forEach(e => {
      console.log(`  - ${e.title.substring(0, 60)} (suggested: ${e.suggested})`);
    });
    if (eventsMissingImages.length > 10) {
      console.log(`  ... and ${eventsMissingImages.length - 10} more`);
    }
  }
  
  console.log(`\n📝 ICS file updated: ${ICS_PATH}`);
}

// Run
updateImageLinks();
