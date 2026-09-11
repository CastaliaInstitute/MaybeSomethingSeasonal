const fs = require('fs');
const path = require('path');

const ICS_PATH = path.join(__dirname, '..', 'public', 'MSS.ics');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const BASE_PATH = 'https://mss.castalia.institute';

  // Mapping from holiday descriptions (first line of DESCRIPTION) to image filenames
// Based on the final-image-holiday-mapping.json and existing image names
const HOLIDAY_TO_IMAGE = {
  // New Year
  'Celebration of the new year and fresh beginnings': 'new-years-day-champagne-and-confetti.jpg',
  'New Years Day': 'new-years-day-champagne-and-confetti.jpg',
  
  // January
  'Austrian and Bavarian tradition, Perchta Day': 'austrian-and-bavarian-tradition-perchta-day.jpg',
  'Perchtag': 'austrian-and-bavarian-tradition-perchta-day.jpg',
  'Candlemas - Feast of the Presentation of Jesus and blessing of candles': 'candlemas-feast-of-the-presentation-of-jesus-and-blessing-of-candles.jpg',
  'Candelaria': 'candlemas-feast-of-the-presentation-of-jesus-and-blessing-of-candles.jpg',
  'Twelfth Night - end of the Christmas season': 'twelfth-night-end-of-the-christmas-season.jpg',
  'Epiphany - Three Kings Day, celebration of the Magi': 'epiphany-three-kings-day-celebration-of-the-magi.jpg',
  'Día de los Reyes': 'epiphany-three-kings-day-celebration-of-the-magi.jpg',
  'Vodoun Festival - traditional celebration in Benin honoring Vodoun spirituality and culture': 'vodoun-festival-traditional-celebration-in-benin-honoring-vodoun-spirituality-an.jpg',
  'Feast of the Ass - medieval festival celebrating the Flight into Egypt': 'feast-of-the-ass-medieval-festival-celebrating-the-flight-into-egypt.jpg',
  'Japanese New Year tradition of burning New Year decorations': 'japanese-new-year-tradition-of-burning-new-year-decorations.jpg',
  'Dondoyaki': 'japanese-new-year-tradition-of-burning-new-year-decorations.jpg',
  'Old Twelfth Night - traditional date before calendar reform': 'old-twelfth-night-traditional-date-before-calendar-reform.jpg',
  'Scottish celebration of the poet Robert Burns with poetry, haggis, and whisky': 'scottish-celebration-of-the-poet-robert-burns-with-poetry-haggis-and-whisky.jpg',
  'Lunar New Year celebration': 'lunar-new-year-celebration.jpg',
  'Tibetan New Year - celebration of the lunar new year in Tibetan culture': 'tibetan-new-year-celebration-of-the-lunar-new-year-in-tibetan-culture.jpg',
  
  // February
  'Eve of Imbolc, the Celtic festival marking the beginning of spring': 'eve-of-imbolc-the-celtic-festival-marking-the-beginning-of-spring.jpg',
  'Imbolc Eve': 'eve-of-imbolc-the-celtic-festival-marking-the-beginning-of-spring.jpg',
  'Celtic festival marking the beginning of spring': 'celtic-festival-marking-the-beginning-of-spring.jpg',
  'Imbolc': 'celtic-festival-marking-the-beginning-of-spring.jpg',
  
  // March
  'Patron saint of love and romance': 'patron-saint-of-love-and-romance.jpg',
  'Patron saint of Ireland - celebrated worldwide': 'patron-saint-of-ireland-celebrated-worldwide.jpg',
  
  // April
  'Celebrate our planet and environmental awareness': 'celebrate-our-planet-and-environmental-awareness.jpg',
  
  // July
  'Celebration of American independence': 'celebration-of-american-independence.jpg',
  
  // September
  'Fall begins - time for harvest and reflection': 'fall-begins-time-for-harvest-and-reflection.jpg',
  
  // October/November
  'All Hallows\' Eve, celebration of saints and departed souls': 'halloween-jack-o-lantern-and-black-cat.jpg',
  'Día de los Angelitos - honoring deceased children': 'dia-de-los-angelitos-honoring-deceased-children.jpg',
  'Día de los Muertos - celebration of deceased loved ones': 'dia-de-los-muertos-celebration-of-deceased-loved-ones.jpg',
  'el Día de Muertos': 'dia-de-los-muertos-celebration-of-deceased-loved-ones.jpg',
  'Evening before St. Martin\'s Day, traditional celebration': 'evening-before-st-martins-day-traditional-celebration.jpg',
  'Feast of St. Martin of Tours, patron of soldiers and beggars': 'feast-of-st-martin-of-tours-patron-of-soldiers-and-beggars.jpg',
  'Martinstag': 'feast-of-st-martin-of-tours-patron-of-soldiers-and-beggars.jpg',
  'Wookiee celebration from the Star Wars universe': 'wookiee-celebration-from-the-star-wars-universe.jpg',
  'Gratitude for the harvest and blessings of the year': 'gratitude-for-the-harvest-and-blessings-of-the-year.jpg',
  'Eve of St. Andrew\'s Day, traditional celebration': 'eve-of-st-andrews-day-traditional-celebration.jpg',
  'Andermas Eve': 'eve-of-st-andrews-day-traditional-celebration.jpg',
  'Feast of St. Andrew, patron saint of Scotland': 'feast-of-st-andrew-patron-saint-of-scotland.jpg',
  'St Andrew\'s Day': 'feast-of-st-andrew-patron-saint-of-scotland.jpg',
  'First Sunday of Advent - the beginning of the liturgical year and preparation for Christmas': 'first-sunday-of-advent-the-beginning-of-the-liturgical-year-and-preparation-for-christmas.jpg',
  'Krampus Night - the dark companion of St. Nicholas': 'krampus-night-the-dark-companion-of-st-nicholas.jpg',
  'Krampusnacht': 'krampus-night-the-dark-companion-of-st-nicholas.jpg',
  'Feast of St. Nicholas, bishop and patron saint of children and gift-giving': 'feast-of-st-nicholas-bishop-and-patron-saint-of-children-and-gift-giving.jpg',
  'St Nicks Day': 'feast-of-st-nicholas-bishop-and-patron-saint-of-children-and-gift-giving.jpg',
  'Second Sunday of Advent - preparation and anticipation': 'second-sunday-of-advent-preparation-and-anticipation.jpg',
  'Traditional Dutch celebration period with Sinterklaas arriving by steamboat, starting from dusk on St. Martin\'s Day': 'traditional-dutch-celebration-period-with-sinterklaas-arriving-by-steamboat-star.jpg',
  'St. Lucia\'s vigil - from dusk on Dec 11 until dawn on Dec 12': 'st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12.jpg',
  'Lussevaka': 'st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12.jpg',
  'Lussinatta (St. Lucia\'s Vigil)': 'st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12.jpg',
  'Lussinatta': 'st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12.jpg',
  'Lussinatt': 'st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12.jpg',
  'Feast of Our Lady of Guadalupe, patroness of the Americas': 'feast-of-our-lady-of-guadalupe-patroness-of-the-americas.jpg',
  'Virgin of Guadalupe': 'feast-of-our-lady-of-guadalupe-patroness-of-the-americas.jpg',
  'Swedish celebration of light and St. Lucia': 'swedish-celebration-of-light-and-st-lucia.jpg',
  'Annual tradition in Palmer Lake, Colorado: community yule log hunt and celebration': 'annual-tradition-in-palmer-lake-colorado-community-yule-log-hunt-and-celebration.jpg',
  'Third Sunday of Advent (Gaudete Sunday) - joy and rejoicing': 'third-sunday-of-advent-gaudete-sunday-joy-and-rejoicing.jpg',
  'Festival of Lights - eight nights of celebration, starting at dusk on Dec 15': 'festival-of-lights-eight-nights-of-celebration-starting-at-dusk-on-dec-15.jpg',
  'Hanukkah': 'festival-of-lights-eight-nights-of-celebration-starting-at-dusk-on-dec-15.jpg',
  'Ancient Roman festival of Saturn': 'ancient-roman-festival-of-saturn.jpg',
  'Saturnalia': 'ancient-roman-festival-of-saturn.jpg',
  'Eve of the winter solstice, the longest night': 'eve-of-the-winter-solstice-the-longest-night.jpg',
  'Fourth Sunday of Advent - final preparation before Christmas': 'fourth-sunday-of-advent-final-preparation-before-christmas.jpg',
  'The shortest day - embrace the darkness and prepare for renewal': 'eve-of-the-winter-solstice-the-longest-night.jpg',
  'Solstice': 'eve-of-the-winter-solstice-the-longest-night.jpg',
  'Yalda Night - Persian celebration of the winter solstice, the longest night of the year': 'yalda-night-persian-celebration-of-the-winter-solstice-the-longest-night-of-the-.jpg',
  'Night of the Radishes - traditional Oaxacan festival': 'night-of-the-radishes-traditional-oaxacan-festival.jpg',
  'Vigil of the Nativity, anticipation of Christ\'s birth': 'caga-tio.svg',
  'Christmas Eve': 'caga-tio.svg',
  'Birth of Jesus Christ, joy and celebration': 'birth-of-jesus-christ-joy-and-celebration.jpg',
  'Christmas': 'birth-of-jesus-christ-joy-and-celebration.jpg',
  'Celebration of St. Stephen, the first martyr': 'image21.jpg',
  'Feast of St. Stefan': 'image21.jpg',
  'Feast of the Holy Innocents, also known as Childermas': 'feast-of-the-holy-innocents-also-known-as-childermas.jpg',
  'Childermas': 'feast-of-the-holy-innocents-also-known-as-childermas.jpg',
  'Tiki Christmas at Pearl Harbor': 'pearl-harbor-day-godzilla-santa-hat.png',
  'Pearl Harbor Day': 'pearl-harbor-day-godzilla-santa-hat.png',
  'Pearl Harbor': 'pearl-harbor-day-godzilla-santa-hat.png',
};

// Normalize description text for matching
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate filename from description
function generateFilename(description) {
  return description
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) + '.jpg';
}

// Find best matching holiday for a description
function findMatchingImage(description) {
  const normalized = normalizeText(description);
  
  // Try exact match first
  if (HOLIDAY_TO_IMAGE[description]) {
    return HOLIDAY_TO_IMAGE[description];
  }
  
  // Try partial matches
  for (const [holiday, image] of Object.entries(HOLIDAY_TO_IMAGE)) {
    const normalizedHoliday = normalizeText(holiday);
    if (normalized.includes(normalizedHoliday) || normalizedHoliday.includes(normalized)) {
      return image;
    }
  }
  
  // If no match found, generate filename from description
  return generateFilename(description);
}

function updateIcsImageLinks() {
  console.log('🔗 Linking ICS events to images...\n');
  
  if (!fs.existsSync(ICS_PATH)) {
    console.error('❌ ICS file not found:', ICS_PATH);
    process.exit(1);
  }
  
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('❌ Images directory not found:', IMAGES_DIR);
    process.exit(1);
  }
  
  // Get available images
  const availableImages = new Set();
  fs.readdirSync(IMAGES_DIR)
    .filter(
      (f) =>
        f.endsWith('.jpg') ||
        f.endsWith('.jpeg') ||
        f.endsWith('.png') ||
        f.endsWith('.svg'),
    )
    .forEach(f => availableImages.add(f));
  
  console.log(`📁 Found ${availableImages.size} images in ${IMAGES_DIR}\n`);
  
  // Read ICS file
  const content = fs.readFileSync(ICS_PATH, 'utf8');
  const lines = content.split('\n');
  
  const updatedLines = [];
  let inEvent = false;
  let currentEvent = {};
  let eventsUpdated = 0;
  let eventsMissingImages = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect event start - either BEGIN:VEVENT or UID (for files without BEGIN:VEVENT)
    // Also handle case where first event starts with UID after END:VEVENT
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = { startIndex: i };
    } else if (trimmed.startsWith('UID:') && !inEvent) {
      inEvent = true;
      currentEvent = { startIndex: i };
    } else if (trimmed === 'END:VEVENT' && inEvent) {
      // Process event before closing
      if (currentEvent.description) {
        const firstLine = currentEvent.description.split('\\n')[0].trim();
        const matchingImage = findMatchingImage(firstLine);
        
        if (matchingImage) {
          const newPath = `${BASE_PATH}/images/${matchingImage}`;
          const imageExists = availableImages.has(matchingImage);
          
          // Check if we need to add or update X-IMAGE
          if (!currentEvent.hasImage) {
            // Add X-IMAGE before END:VEVENT
            updatedLines.push(`X-IMAGE:${newPath}`);
            eventsUpdated++;
            if (imageExists) {
              console.log(`✅ Added image for: ${firstLine.substring(0, 60)}`);
              console.log(`   → ${matchingImage}`);
            } else {
              console.log(`⚠️  Added image link (file not found): ${firstLine.substring(0, 60)}`);
              console.log(`   → ${matchingImage}`);
              eventsMissingImages.push({
                description: firstLine,
                image: matchingImage,
                reason: 'Image file not found'
              });
            }
          } else {
            // Update existing X-IMAGE if different
            const oldPath = currentEvent.imagePath || '';
            if (oldPath !== newPath) {
              // Replace the existing X-IMAGE line
              updatedLines.push(`X-IMAGE:${newPath}`);
              eventsUpdated++;
              console.log(`🔄 Updated image for: ${firstLine.substring(0, 60)}`);
              console.log(`   ${oldPath} → ${newPath}`);
              if (!imageExists) {
                eventsMissingImages.push({
                  description: firstLine,
                  image: matchingImage,
                  reason: 'Image file not found'
                });
              }
            } else {
              // Keep existing X-IMAGE line (same path)
              updatedLines.push(`X-IMAGE:${oldPath}`);
            }
          }
        } else {
          // No matching image found - generate one from description
          const generatedImage = generateFilename(firstLine);
          const newPath = `${BASE_PATH}/images/${generatedImage}`;
          
          if (!currentEvent.hasImage) {
            updatedLines.push(`X-IMAGE:${newPath}`);
            eventsUpdated++;
            console.log(`📝 Generated image link: ${firstLine.substring(0, 60)}`);
            console.log(`   → ${generatedImage}`);
            eventsMissingImages.push({
              description: firstLine,
              image: generatedImage,
              reason: 'Generated from description (file not found)'
            });
          } else {
            // Keep existing X-IMAGE
            updatedLines.push(`X-IMAGE:${currentEvent.imagePath}`);
          }
        }
      } else {
        // No description, but if there was an X-IMAGE, keep it
        if (currentEvent.hasImage) {
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
      currentEvent.imageIndex = i;
      // Don't add this line yet - we'll update it when we process the event
    } else {
      updatedLines.push(line);
    }
  }
  
  // Write updated ICS file
  fs.writeFileSync(ICS_PATH, updatedLines.join('\n'));
  
  console.log(`\n✅ Updated ${eventsUpdated} image links in ICS file`);
  console.log(`📝 ICS file saved: ${ICS_PATH}\n`);
  
  if (eventsMissingImages.length > 0) {
    console.log(`⚠️  ${eventsMissingImages.length} events missing images:`);
    eventsMissingImages.slice(0, 20).forEach(e => {
      if (e.image) {
        console.log(`  - ${e.description.substring(0, 60)}`);
        console.log(`    Expected: ${e.image} (${e.reason})`);
      } else {
        console.log(`  - ${e.description.substring(0, 60)} (${e.reason})`);
      }
    });
    if (eventsMissingImages.length > 20) {
      console.log(`  ... and ${eventsMissingImages.length - 20} more`);
    }
  }
}

// Run
if (require.main === module) {
  updateIcsImageLinks();
}

module.exports = { updateIcsImageLinks };
