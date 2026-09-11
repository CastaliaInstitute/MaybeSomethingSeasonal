const fs = require('fs');
const path = require('path');

const ICS_PATH = path.join(__dirname, '..', 'public', 'MSS.ics');
const DIST_ICS_PATH = path.join(__dirname, '..', 'dist', 'MSS.ics');
const IMAGE_BASE_URL =
  process.env.IMAGE_BASE_URL ||
  'https://mss.castalia.institute';
const KEY_BASE_YEAR = '2025';
const YEAR_SHIFT_THRESHOLD_MONTH = 11; // November (1-indexed)
const YEAR_SHIFT_TARGET = '2026';

/**
 * Helper to escape text for ICS properties.
 */
function escapeIcs(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function unescapeIcs(value = '') {
  return String(value)
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';');
}

/**
 * Fold ICS content lines to 75 octets with continuation.
 */
function foldLine(line) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }
  let result = line.slice(0, maxLength);
  let index = maxLength;
  while (index < line.length) {
    result += '\n ' + line.slice(index, index + maxLength);
    index += maxLength;
  }
  return result;
}

/**
 * Parse the existing ICS file into an array of event objects while preserving headers.
 */
function parseIcs(raw) {
  const lines = raw.split(/\r?\n/);
  const header = [];
  const events = [];
  let index = 0;

  while (index < lines.length && lines[index] !== 'BEGIN:VEVENT') {
    header.push(lines[index]);
    index += 1;
  }

  while (index < lines.length) {
    if (lines[index] === 'BEGIN:VEVENT') {
      index += 1;
      const event = {};
      let lastKey = null;

      while (index < lines.length && lines[index] !== 'END:VEVENT') {
        const line = lines[index];
        if (line.startsWith(' ') && lastKey) {
          event[lastKey] = (event[lastKey] || '') + line.slice(1);
        } else {
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).split(';')[0];
            const value = line.slice(colonIndex + 1);
            event[key] = value;
            lastKey = key;
          }
        }
        index += 1;
      }
      events.push(event);
    }
    index += 1;
  }

  return { header, events };
}

function buildDescription({ history, traditions, feasting }, icon, category, weekday) {
  const parts = [
    `History: ${history}`,
    `Traditions: ${traditions}`,
    `Feasting: ${feasting}`,
  ];
  if (weekday) {
    parts.push(`Day: ${weekday}`);
  }
  parts.push(
    '',
    `Icon: ${icon}`,
    `Category: ${category}`
  );
  return parts.join('\n');
}

function toAbsoluteImage(pathValue = '') {
  if (!pathValue) {
    return '';
  }
  if (/^https?:\/\//i.test(pathValue)) {
    return pathValue;
  }
  const cleanBase = IMAGE_BASE_URL.replace(/\/$/, '');
  const cleanPath = pathValue.startsWith('/') ? pathValue.slice(1) : pathValue;
  return `${cleanBase}/${cleanPath}`;
}

function normaliseDateForKey(value = '') {
  if (!value) return value;
  return value.replace(/^\d{4}/, KEY_BASE_YEAR);
}

function shiftDateToTargetYear(value = '') {
  if (!value) return value;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(.*)$/);
  if (!match) return value;
  const [, year, month, day, rest] = match;
  const numericMonth = Number(month);
  if (Number(year) === Number(KEY_BASE_YEAR) && numericMonth < YEAR_SHIFT_THRESHOLD_MONTH) {
    return `${YEAR_SHIFT_TARGET}${month}${day}${rest}`;
  }
  return value;
}

function formatWeekdayLabel(value = '') {
  if (!value) return '';
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  if (!year || !month || !day) return '';
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Event metadata keyed by `${DTSTART}|${slug}`
 */
const EVENT_DETAILS = {
  '20250101T070000Z|celebration-of-the-new-year-and-fresh-beginnings': {
    title: "New Year's Day",
    history: `The Roman calendar fixed the turn of the civil year to January 1 under Julius Caesar, and the Gregorian reform of 1582 reaffirmed the date for much of the world.`,
    traditions: `Communities ring bells, count down in packed squares, exchange resolutions, and watch fireworks or televised celebrations to welcome a clean slate.`,
    feasting: `Families toast with sparkling wine, share longevity noodles or Hoppin' John for luck, and slice sweet breads like panettone or king cakes to invite prosperity.`,
  },
  '20250102T070000Z|austrian-and-bavarian-tradition-perchta-day': {
    title: 'Perchta Day (Perchtenlauf)',
    history: `Alpine folklore honors Frau Perchta, a wintry guardian of hearth and spinning who inspected homes during the Twelve Nights after Christmas.`,
    traditions: `Villages in Austria and Bavaria host Perchtenlaeufe where masked figures parade with cowbells and torches to chase away darkness and protect the fields.`,
    feasting: `Hosts offer dumplings, poppy-seed pastries, and milky punches to the performers, along with mulled wine and sweet krapfen for the crowd.`,
  },
  '20250102T070000Z|candlemas-feast-of-the-presentation-of-jesus-and-blessing-of-candles': {
    title: 'Candlemas (Feast of the Presentation)',
    history: `Commemorated in Jerusalem by the fourth century, Candlemas marks forty days after Christmas when Mary and Joseph presented Jesus at the Temple according to Mosaic law.`,
    traditions: `Churches bless candles for the coming year, processions illuminate winter nights, and weather lore predicts the remaining length of winter.`,
    feasting: `La Chandeleur tables offer crepes beurre sucre, crepes jambon-fromage, boles de cidre brut, and salade de mache; in Mexico, familias sirven tamales oaxaquenos, tamales de dulce, atole de canela, champurrado espumoso, and pan de candelaria after the blessing of candles.`,
  },
  '20250102T070000Z|': {
    title: 'Berchtoldstag',
    history: `Swiss guilds and villages have observed Berchtoldstag since the Middle Ages as a post-feast civic day to reaffirm community bonds after New Year.`,
    traditions: `Families make Berchteln visits, children knock on doors during Baerzelistag parades, and neighbours trade well wishes with carved masks or pine boughs.`,
    feasting: `Tables feature braided Zopf loaves, roesti skillets, sausages, hazelnut tortes, and pots of melted cheese meant for communal dipping.`,
  },
  '20250105T070000Z|twelfth-night-end-of-the-christmas-season': {
    title: 'Twelfth Night',
    history: `Twelfth Night concludes the Christmastide counting from medieval Europe, blending Christian Epiphany vigils with older winter revels.`,
    traditions: `Hosts crown a king or queen with hidden bean charms, wassailers sing at doorways, and revelers dismantle greenery to avoid a year of bad fortune.`,
    feasting: `Tables feature spiced ale, figgy puddings, king cakes filled with almonds, and roasted meats shared before the fasting of Epiphany begins.`,
  },
  '20250106T070000Z|epiphany-three-kings-day-celebration-of-the-magi': {
    title: 'Epiphany (Three Kings Day)',
    history: `Since the second century, Epiphany has celebrated the Magi recognising the Christ child, symbolising the revelation of the divine to the nations.`,
    traditions: `Families bless doorways with chalk, stage pageants of camels and kings, and children receive gifts left by los Reyes Magos or La Befana.`,
    feasting: `Bakers craft rosca de reyes, galette des rois, or king cakes, while households sip rich hot chocolate and share slow-simmered stews.`,
  },
  '20250110T070000Z|vodoun-festival-traditional-celebration-in-benin-honoring-vodoun-spirituality-an': {
    title: 'Fete du Vodoun (Benin Vodoun Festival)',
    history: `Benin recognised Vodoun as a national religion in 1996, formalising annual January gatherings that honour ancestral spirits and the transatlantic heritage of resistance.`,
    traditions: `Processions of priests, devotees, and Egungun dancers drum along Ouidah's Route des Esclaves, offering libations at the Temple of Pythons and the seaside.`,
    feasting: `Festival goers share akassa corn porridge, goat and fish stews flavoured with palm oil, toasted peanuts, and generous pours of sodabi palm liquor.`,
  },
  '20250114T070000Z|feast-of-the-ass-medieval-festival-celebrating-the-flight-into-egypt': {
    title: 'Feast of the Ass',
    history: `Medieval French parishes staged the Feast of the Ass to honour the donkey that carried the Holy Family during the Flight into Egypt and other biblical journeys.`,
    traditions: `A bedecked donkey processed to church while congregations answered prayers with playful brays, blending devotion with carnival humour.`,
    feasting: `Le repas rustique propose pain de campagne, soupe aux pois secs, galette au miel, tarte aux noix, fromage de chevre, and cruches de vin epice hypocras shared in honour of the humble ane.`,
  },
  '20250115T070000Z|japanese-new-year-tradition-of-burning-new-year-decorations': {
    title: 'Dondoyaki Bonfire',
    history: `Dondoyaki descends from Heian-period shrine rites that respectfully retire shimenawa ropes, daruma, and calligraphy written during the New Year festivities.`,
    traditions: `Communities pile pine branches and lucky charms into tall pyres, send sparks skyward with communal prayers, and children roast lucky rice cakes in the embers.`,
    feasting: `Skewered mochi toasted over the flames, sweet azuki bean soup, and cups of warm amazake fortify neighbours against the cold night air.`,
  },
  '20250117T070000Z|old-twelfth-night-traditional-date-before-calendar-reform': {
    title: 'Old Twelfth Night Wassail',
    history: `When Britain adopted the Gregorian calendar in 1752, many West Country farmers kept the old January date for Twelfth Night to bless orchards against blight.`,
    traditions: `Wassailers bang pans, fire muskets into branches, and sing to wake the apple trees while offering cider-soaked toast to the guardian robin.`,
    feasting: `Hot mulled cider, apple cakes, blue cheese, and pork pies fuel the rounds from farm to farm through the frosty fields.`,
  },
  '20250125T070000Z|scottish-celebration-of-the-poet-robert-burns-with-poetry-haggis-and-whisky': {
    title: 'Burns Night Supper',
    history: `The first Burns Night was held in 1801 by friends of Robert Burns, celebrating the Bard's January birth with readings that cemented his role in Scottish identity.`,
    traditions: `Kilted hosts pipe in the haggis, deliver the Address with flourish, toast the lassies, and end with ceilidh dances and "Auld Lang Syne."`,
    feasting: `Menus centre on haggis with neeps and tatties, cock-a-leekie soup, cranachan, oatcakes, and drams of smoky single malt whisky.`,
  },
  '20250129T070000Z|lunar-new-year-celebration': {
    title: 'Lunar New Year (Chunjie)',
    history: `Rooted in Han dynasty agrarian cycles, the Lunar New Year welcomes spring with family reunions, ancestor veneration, and hopes for prosperity.`,
    traditions: `Homes are scrubbed, red lanterns strung, hongbao envelopes gifted, and lion or dragon dances chase away lingering Nian monsters.`,
    feasting: `Reunion banquets showcase longevity noodles, whole fish, dumplings shaped like ingots, sweet rice cakes, and mandarin oranges for abundance.`,
  },
  '20250129T070000Z|tibetan-new-year-celebration-of-the-lunar-new-year-in-tibetan-culture': {
    title: 'Losar (Tibetan New Year)',
    history: `Losar blends ancient Bon winter rites with Buddhist observances, dating to the era of King Trisong Detsen and now marking the Tibetan calendar's turning.`,
    traditions: `Families replace prayer flag streamers, visit monasteries for cham dances, and exchange khata scarves while reciting auspicious wishes.`,
    feasting: `Households prepare guthuk noodle soup with symbolic dumplings, deep-fried khapse pastries, dried yak cheese, and butter tea shared with neighbours.`,
  },
  '20250130T070000Z|eve-of-imbolc-the-celtic-festival-marking-the-beginning-of-spring': {
    title: 'Imbolc Eve (La Fheile Bride)',
    history: `Imbolc heralds the first stirrings of spring in ancient Gaelic tradition, bridged later with the veneration of Saint Brigid of Kildare.`,
    traditions: `Families fashion Brigid's crosses, set out corn dollies to receive the saint's blessing, and keep vigil fires burning through the night.`,
    feasting: `Dairy-rich dishes--fresh butter, soft cheeses, oatcakes, and early lamb stews--honour Brigid's patronage of livestock and the hearth.`,
  },
  '20250201T070000Z|eve-of-imbolc-the-celtic-festival-marking-the-beginning-of-spring': {
    title: 'Imbolc Day Celebration',
    history: `With the lambing season underway, Imbolc marks the midpoint between solstice and equinox, long tied to the rebirth of light and Brigid's protective cloak.`,
    traditions: `Pilgrims visit holy wells, sprinkle thresholds with blessed water, and hang swaddles outdoors to absorb Brigid's healing power.`,
    feasting: `Communities share bannocks, colcannon, dulse, and honeyed porridges, often concluding with tea infused with the first tender herbs.`,
  },
  '20250214T070000Z|patron-saint-of-love-and-romance': {
    title: "Saint Valentine's Day",
    history: `The feast of the third-century martyr Valentine intertwined with courtly love through Chaucer's poetry and later Victorian card exchanges.`,
    traditions: `Couples exchange handwritten notes, roses, and acts of service, while many support charitable causes in the spirit of selfless love.`,
    feasting: `Sweethearts linger over chocolate-dipped strawberries, heart-shaped confections, fine champagne, and candlelit suppers for two.`,
  },
  '20250317T060000Z|patron-saint-of-ireland-celebrated-worldwide': {
    title: "Saint Patrick's Day",
    history: `Patrick's fifth-century mission in Ireland inspired medieval hagiographies, and Irish diaspora communities transformed his feast into global parades of pride.`,
    traditions: `Bagpipers march past green landmarks, shamrock pins bedeck lapels, and Gaelic blessings are shared between friends and strangers alike.`,
    feasting: `Menus highlight corned beef and cabbage, soda bread, colcannon, smoked salmon, and stout or whiskey raised in hearty toast.`,
  },
  '20250422T060000Z|celebrate-our-planet-and-environmental-awareness': {
    title: 'Earth Day',
    history: `US senator Gaylord Nelson and organiser Denis Hayes launched Earth Day in 1970, igniting the modern environmental movement with teach-ins across the country.`,
    traditions: `Volunteers plant trees, clean waterways, host sustainability workshops, and advocate for climate justice at community fairs.`,
    feasting: `Earth-friendly gatherings feature seasonal salads, plant-based potlucks, fair-trade coffee, and desserts sweetened with local honey.`,
  },
  '20250704T060000Z|celebration-of-american-independence': {
    title: 'Independence Day (United States)',
    history: `The Continental Congress adopted the Declaration of Independence on 4 July 1776, with the date declared a federal holiday nearly a century later.`,
    traditions: `Cities hold patriotic parades, read the Declaration aloud, stage concerts, and end the night with brilliant fireworks displays.`,
    feasting: `Backyard grills sizzle with burgers, hot dogs, corn on the cob, baked beans, berry pies, and pitchers of lemonade or sweet tea.`,
  },
  '20250922T060000Z|fall-begins-time-for-harvest-and-reflection': {
    title: 'Autumn Equinox (Mabon)',
    history: `The equinox equalises day and night worldwide, inspiring harvest observances from Ancient Greece's Thesmophoria to modern pagan Mabon rites.`,
    traditions: `People decorate altars with gourds and leaves, practice gratitude journaling, and take twilight walks to feel the seasonal balance.`,
    feasting: `Harvest tables brim with roasted squash, apple tarts, caramelised root vegetables, mulled cider, and hearty grain salads.`,
  },
  '20251031T060000Z|all-hallows-eve-celebration-of-saints-and-departed-souls': {
    title: "All Hallows' Eve (Halloween)",
    history: `Halloween evolved from Celtic Samhain festivals and medieval vigils before All Saints' Day, blending remembrance with merrymaking.`,
    traditions: `Costumed revelers carve jack-o'-lanterns, tell ghost stories, visit haunted houses, and children collect sweets door to door.`,
    feasting: `Seasonal treats include candy apples, pumpkin bread, roasted nuts, soul cakes, and steaming mugs of spiced cider.`,
  },
  '20251101T070000Z|image22': {
    title: 'Dia de los Angelitos',
    history: `On 1 November, Mexican families honour children who have died, believing their angelitos return first to enjoy the love of their kin.`,
    traditions: `Altars glow with candles, toys, and paper cut-outs, while families ring bells and scatter marigolds to guide the little spirits home.`,
    feasting: `Offerings feature atole, sugar skulls, tiny pan de muerto loaves, fruit, and favourite sweets that delighted the children in life.`,
  },
  '20251102T070000Z|image21': {
    title: 'Dia de los Muertos',
    history: `Rooted in pre-Hispanic customs later intertwined with Catholic All Souls' rites, Dia de los Muertos celebrates ancestral continuity on 2 November.`,
    traditions: `Families build ofrendas with photos and copal incense, picnic beside candlelit graves, and share stories through the night.`,
    feasting: `Traditional dishes include pan de muerto, mole, tamales, champurrado, and calaveras de azucar painted with loved ones' names.`,
  },
  '20251110T070000Z|image23': {
    title: 'Martinstag Lantern Evening',
    history: `Eves of St. Martin's Day in German-speaking lands recall the charitable Roman soldier turned bishop who shared his cloak with a beggar.`,
    traditions: `Children carry handmade lanterns through the streets, sing Sankt Martin songs, and end with bonfires or shadow plays retelling his compassion.`,
    feasting: `Warm cider, pretzels, roasted chestnuts, and buttery pastries reward lantern bearers after the chilly evening walk.`,
  },
  '20251111T070000Z|image24': {
    title: "St. Martin's Day (Martinstag)",
    history: `Medieval Europe celebrated 11 November as the close of the agrarian year, pairing St. Martin's biography with harvest thanksgiving and almsgiving.`,
    traditions: `Lantern parades, charity drives, and dramatizations of Martin's cloak-sharing remind communities to care for those in need.`,
    feasting: `Feasts centre on roast goose with red cabbage, potato dumplings, spiced biscuits, and mugs of Gluehwein or Federweisser.`,
  },
  '20251117T070000Z|wookiee-celebration-from-the-star-wars-universe': {
    title: 'Life Day (Wookiee Tradition)',
    history: `Life Day debuted in the 1978 Star Wars Holiday Special and later became canon as Kashyyyk's annual celebration of freedom and family.`,
    traditions: `Wookiees gather beneath the Tree of Life, sing in the Shyriiwook tongue, share glowing orbs, and meditate on harmony across the galaxy.`,
    feasting: `Fans imagine ryshcate sweet breads, bantha stew, roasted yeca fruits, and steaming mugs of blue bantha milk enjoyed around communal tables.`,
  },
  '20251127T070000Z|image26': {
    title: 'Thanksgiving Day (United States)',
    history: `Thanksgiving commemorates harvest gatherings and the 1621 Wampanoag-Plymouth meal, formalised as a national holiday by Abraham Lincoln in 1863.`,
    traditions: `Families travel for gratitude circles, watch giant-balloon parades and football games, and volunteer at community kitchens.`,
    feasting: `Menus highlight roast turkey, cornbread stuffing, cranberry relish, sweet potatoes, green bean casseroles, and slices of pumpkin or pecan pie.`,
  },
  '20251129T070000Z|image27': {
    title: "Noaptea Lupilor",
    history: `Polish Andrzejki fortune-telling parties date to the sixteenth century, once focused on young women seeking visions of future spouses.`,
    traditions: `Participants pour hot wax through keys, decode shapes in candle shadows, and dance until dawn while sharing playful prophecies.`,
    feasting: `Guests snack on poppy-seed cakes, honey cookies, pickled herring, and warm cups of mead or herb-infused tea.`,
  },
  '20251130T070000Z|feast-of-st-andrew-patron-saint-of-scotland': {
    title: "St. Andrew's Day",
    history: `Scotland adopted St. Andrew, one of the first-called apostles, as its patron in the Middle Ages, with the Saltire flag symbolising his X-shaped cross.`,
    traditions: `Ceilidh dancing, storytelling, and concerts celebrate Scottish heritage, while charities mark the day with kindness campaigns.`,
    feasting: `Cullen skink chowder, bannocks, venison pies, shortbread, and drams of whisky warm celebrants on a chilly November evening.`,
  },
  '20251130T070000Z|image28': {
    title: 'First Sunday of Advent',
    history: `Advent Sundays evolved in the liturgies of fifth-century Gaul as a penitential preparation leading to Christmas joy.`,
    traditions: `Families light the first candle of hope on Advent wreaths, begin Jesse tree devotions, and set aside time for quiet reflection.`,
    feasting: `Seasonal flavours include German stollen, lebkuchen, mulled cider, and simple Sunday roasts shared after worship.`,
  },
  '20251205T070000Z|image29': {
    title: 'Krampusnacht',
    history: `Krampus figures arise from Alpine folklore, accompanying St. Nicholas since at least the seventeenth century to discipline mischievous youth.`,
    traditions: `Costumed Krampusse parade through streets with rattling chains, visit homes for staged scares, and pose for playful photos with brave children.`,
    feasting: `Spectators sip schnapps, nibble gingerbread hearts, and enjoy spicy sausages or pretzels after the adrenaline-filled procession.`,
  },
  '20251206T070000Z|image30': {
    title: "St. Nicholas Day",
    history: `The fourth-century bishop Nicholas of Myra inspired legends of secret generosity, leading to shoe-filling customs across Europe on 6 December.`,
    traditions: `Children polish boots for St. Nicholas, find oranges and nuts at dawn, and listen to stories of the saint rescuing sailors and the poor.`,
    feasting: `Families savour speculaas biscuits, chocolate coins, mandarin oranges, marzipan fruits, and mugs of hot cocoa or gluehwein.`,
  },
  '20251207T070000Z|image31': {
    title: 'Second Sunday of Advent',
    history: `The second Advent candle emphasises faith and the prophets, sustaining the season's anticipation as Christmas draws nearer.`,
    traditions: `Wreath lighting, scripture readings about John the Baptist, and charity collections for neighbours in need mark the Sunday gatherings.`,
    feasting: `Cardamom buns, cinnamon star cookies, spiced teas, and hearty casseroles offer comfort during the contemplative Advent evenings.`,
  },
  '20251210T070000Z|image36': {
    title: 'Magic Flute',
    history: `Mozart's Singspiel Die Zauberflote premiered in 1791 Vienna, enchanting winter audiences with a blend of fairy-tale storytelling and Enlightenment ideals.`,
    traditions: `Opera houses stage festive productions with elaborate stagecraft, families dress for a holiday night out, and communities host singalong overtures that keep spirits bright.`,
    feasting: `Patrons toast with sparkling wine, nibble Viennese pastries, sip rich hot chocolate, and linger over late-night suppers after the curtain call.`,
  },
  '20251111T190000Z|traditional-dutch-celebration-period-with-sinterklaas-arriving-by-steamboat-star': {
    title: 'Sinterklaas Arrival (Intocht)',
    history: `Dutch newspapers popularised Sinterklaas arriving by steamboat in the nineteenth century, blending Saint Nicholas lore with maritime identity.`,
    traditions: `Sinterklaas docks with his Pieten helpers, parades through town distributing pepernoten, and listens to children's wish lists before 5 December gifts.`,
    feasting: `Crowds crunch spiced pepernoten, speculaas windmill cookies, chocolate letters, and marzipan while sipping hot cocoa along the canals.`,
  },
  '20251211T070000Z|st-lucia-s-vigil-from-dusk-on-dec-11-until-dawn-on-dec-12': {
    title: "Lussinatta (St. Lucia's Vigil)",
    history: `In Scandinavia, Lussinatta watchers once guarded against mischief on the long night before Lucia's feast, blending Norse folklore with Christian devotion.`,
    traditions: `Families stay up late baking saffron dough, weaving barabritta crowns, and keeping candles lit to welcome the dawn bringer.`,
    feasting: `Glogg mulled wine, raisin-studded lussekatter twists, and ginger thins are prepared overnight to share with the morning procession.`,
  },
  '20251212T070000Z|feast-of-our-lady-of-guadalupe-patroness-of-the-americas': {
    title: 'Feast of Our Lady of Guadalupe',
    history: `In 1531 Juan Diego reported Marian apparitions on Tepeyac Hill, and the tilma image quickly became a symbol of Mexican faith and identity.`,
    traditions: `Pilgrims serenade the Virgin with mananitas, offer roses at the basilica, and reenact the miracle in parish plazas across the Americas.`,
    feasting: `Peregrinos se reponen con tamales verdes, tamales de rajas con queso, pozole rojo, mole poblano con arroz, tacos dorados, bunuelos de viento, churros de canela, champurrado espumoso, y atole de guayaba antes de continuar las serenatas.`,
  },
  '20251213T070000Z|swedish-celebration-of-light-and-st-lucia': {
    title: "St. Lucia's Day",
    history: `Modern Lucia celebrations took shape in early twentieth-century Sweden, transforming a regional custom into a nationwide festival of light in darkness.`,
    traditions: `Girls and boys form Lucia trains in schools and workplaces, delivering songs and saffron buns to symbolise hope during the polar night.`,
    feasting: `Households share lussekatter, saffron biscotti, almond cookies, and glasses of julmust or coffee to accompany the morning serenade.`,
  },
  '20251215T070000Z|annual-tradition-in-palmer-lake-colorado-community-yule-log-hunt-and-celebration': {
    title: 'Palmer Lake Yule Log Hunt',
    history: `Since 1933 Palmer Lake, Colorado, has staged a community hunt that mixes imported English yule log lore with Rocky Mountain hospitality.`,
    traditions: `Clues lead villagers through the pines until the log is found, carried in parade, and lit amid carols and proclamations of "Wassail!"`,
    feasting: `Volunteers ladle out chili, apple cider, and cookies, while the finder often earns the first slice of yule log cake.`,
  },
  '20251214T070000Z|third-sunday-of-advent-gaudete-sunday-joy-and-rejoicing': {
    title: 'Gaudete Sunday',
    history: `Named for the "Gaudete in Domino" introit, the third Advent Sunday relaxes penitential tones with joyful anticipation noted since the Middle Ages.`,
    traditions: `Churches light the rose candle, priests wear rose vestments, and choirs sing jubilant hymns heralding the nearness of Christmas.`,
    feasting: `In the Philippines, Simbang Gabi worshippers enjoy bibingka and puto bumbong, while others serve rosy macarons and warm fruit punch.`,
  },
  '20251215T190000Z|festival-of-lights-eight-nights-of-celebration-starting-at-dusk-on-dec-15': {
    title: 'Hanukkah (Festival of Lights)',
    history: `Hanukkah commemorates the Maccabean rededication of the Temple in 164 BCE and the rabbinic tale of oil that miraculously lasted eight nights.`,
    traditions: `Families kindle the menorah, recite blessings, play dreidel games, give gelt, and emphasise acts of charity and resilience.`,
    feasting: `Foods fried in oil--potato latkes, sufganiyot, bimuelos--and braised brisket or kugel anchor the festive tables.`,
  },
  '20251217T070000Z|ancient-roman-festival-of-saturn': {
    title: 'Saturnalia',
    history: `Rome's Saturnalia, attested as early as 217 BCE, honoured Saturn with a public holiday of role reversal, gift giving, and temporary liberty for enslaved people.`,
    traditions: `Participants shout "Io Saturnalia!", wear felt pileus caps, and elect mock kings who preside over games and generous exchanges.`,
    feasting: `Banquets overflow with roast pork, olives, mulsum sweet wine, pine nuts, and honey cakes shared between patrons and dependents.`,
  },
  '20251221T070000Z|fourth-sunday-of-advent-final-preparation-before-christmas': {
    title: 'Fourth Sunday of Advent',
    history: `The final Advent Sunday highlights love and the imminence of Christmas, with scriptural focus on Mary's "yes" and the coming of Emmanuel.`,
    traditions: `Families light the last purple candle, assemble creche scenes, finish charitable giving, and practice carols for Christmas masses.`,
    feasting: `Panettone, mince pies, spiced nuts, and savoury tourtiere pies often appear as families wrap gifts and prepare Christmas Eve menus.`,
  },
  '20251221T070000Z|eve-of-the-winter-solstice-the-longest-night': {
    title: 'Winter Solstice (Yule)',
    history: `The solstice marks the sun's rebirth in cultures from Norse Yule to East Asian Dongzhi, blending astronomy with spiritual renewal.`,
    traditions: `People burn yule logs, exchange handmade gifts, meditate at sunrise, and decorate with evergreen boughs and lights symbolising returning warmth.`,
    feasting: `Roasted meats, spiced mead, citrus preserves, and solstice cakes shaped like the sun celebrate the lengthening days ahead.`,
  },
  '20251220T190000Z|eve-of-the-winter-solstice-the-longest-night': {
    title: 'Yalda Night',
    history: `Persian Yalda predates Islam, celebrating the birth of Mithra and later the victory of light over darkness on the longest night.`,
    traditions: `Families stay awake reading Hafez poetry, storytelling, and watching the fire's glow until the first light of dawn.`,
    feasting: `Aperitif glasses of sharbat-e anar o gol-e sorkh—pomegranate and rosewater cordial with mint and lime—open the sofreh before meze of sabzi khordan with herbs, feta, walnuts, and warm flatbread, borani laboo beet yogurt with pistachio, and zeytoon parvardeh olives in pomegranate molasses. The main spread features fesenjān of duck or chicken simmered to a glossy walnut-pomegranate sauce, tahchin-e zereshk saffron rice cake layered with barberries and tender chicken, and khoresht-e bamieh okra stew for vegetarians. Salad-e Shirazi and sesame-topped naan-e barbari brighten the table, while desserts showcase anar o hendevaneh fruit, ajil-e Shab-e Yalda roasted nuts and dried fruits for good fortune, and sholeh zard saffron rice pudding dusted with cinnamon. Guests close the vigil by drawing Hafez divinations as poetry and the promise of returning light fill the night.`,
  },
    '20251223T070000Z|night-of-the-radishes-traditional-oaxacan-festival': {
      title: 'La Noche de Rabanos',
      history: `Oaxaca's Night of the Radishes began in 1897 when farmers carved oversized radishes to entice holiday shoppers, becoming an official civic festival.`,
      traditions: `Artisans sculpt Nativity scenes, dancers, and mythical beasts from radishes, competing for prizes as bands and crowds stroll the zocalo.`,
      feasting: `Cena Tradicional Oaxaquena de Invierno features an ensalada de rabanos with lime and cilantro, tamales de rabano with bright raw radish salsa and atole verde de epazote, champurrado espeso de cacao y masa, optional tamales dulces de pina y pasas, and sips of mezcal artesanal served with orange slices and sal de gusano.`,
    },
  '20251224T070000Z|caga-tio': {
    title: 'Christmas Eve',
    history: `Christian communities have kept the Nativity vigil since the fourth century, preparing through liturgies of lessons, carols, and midnight Mass.`,
    traditions: `Families light Advent candles, attend services, exchange modest gifts, and observe the tradition of refraining from meat until the feast begins.`,
    feasting: `Italian Seven Fishes dinners, Polish wigilia with beet soup and pierogi, and hot cocoa with cookies set the stage for the midnight celebration.`,
  },
  '20251225T070000Z|image21': {
    title: 'Christmas Day',
    history: `By late antiquity the Western church fixed December 25 as the Nativity feast, intertwining with Sol Invictus imagery and evolving into a global holiday.`,
    traditions: `People gather around decorated trees, sing carols, exchange gifts, and share charity with neighbours in the spirit of goodwill.`,
    feasting: `Roast goose or turkey, glazed ham, potatoes, Brussels sprouts, Christmas pudding, and yule logs anchor generous holiday tables.`,
  },
    '20251226T070000Z|image21': {
      title: "St. Stephen's Day (Boxing Day)",
      history: `St. Stephen, the first Christian martyr, is honoured on 26 December; in Britain and Ireland the date also became Boxing Day for giving to servants and the poor.`,
      traditions: `Foxhunts, charity drives, and visits to friends are common, while in Ireland the Wren Boys once paraded door to door collecting donations.`,
      feasting: `Leftover Christmas roasts become hearty pies, paired with bubble-and-squeak, mince pies, and mugs of spiced ale.`,
    },
    '20251227T070000Z|baby-back-ribs': {
      title: 'Feast of the Holy Innocents (Childermas Banquet)',
      history: `Childermas commemorates the Bethlehem children slain under King Herod; medieval English households kept 28 December as the Feast of the Holy Innocents, centring prayers and hospitality on the youngest family members.`,
      traditions: `Households set a whimsical winter table with white candles, holly berries, and silver bells, portion dishes in child-sized servings, and invite the youngest at table to announce each course as the day's presider.`,
      feasting: `A Childermas banquet pours Baby Bellini aperitifs of sparkling wine or apple cider with white peach puree, then cradles baby beet bisque swirled with creme fraiche and dill over star-cut rye croutons; baby greens toss with baby tomatoes, carrots, and corn in honey-citrus vinaigrette with toasted almonds and edible flowers; slow-smoked baby back ribs lacquered in pomegranate glaze and herb-roasted Cornish hens with clementine pan jus arrive beside duck-fat roasted baby potatoes, baby corn gratin with nutmeg-Parmesan crust, and braised baby onions in balsamic reduction; serve pillowy milk rolls with whipped honey butter, finish with baby cheesecakes topped in spiced pear-cranberry compote or tableside baby bananas Foster, and toast with Babycham or warm milk punch dusted with nutmeg.`,
    },
};

function enrich() {
  const raw = fs.readFileSync(ICS_PATH, 'utf8');
  const { header, events } = parseIcs(raw);

  const updatedLines = [...header];
  events.forEach((event) => {
    const slug = (event['X-IMAGE'] || '')
      .split('/')
      .pop()
      .split('.')[0];
    const key = `${normaliseDateForKey(event.DTSTART)}|${slug}`;
    const details = EVENT_DETAILS[key];

    if (!details) {
      throw new Error(`Missing event details for key ${key}`);
    }

    const descriptionSource = unescapeIcs(event.DESCRIPTION || '');
    const iconMatch = descriptionSource.match(/Icon:\s*([^\n]+)/);
    const categoryMatch = descriptionSource.match(/Category:\s*([^\n]+)/);
    const icon = iconMatch ? iconMatch[1].trim() : '';
    const category =
      categoryMatch ? categoryMatch[1].trim() : unescapeIcs(event.CATEGORIES || '').trim();

    const shiftedDtstart = shiftDateToTargetYear(event.DTSTART);
    const shiftedDtend = shiftDateToTargetYear(event.DTEND);
    const weekdayLabel = formatWeekdayLabel(shiftedDtstart);
    const description = buildDescription(details, icon, category, weekdayLabel);

    updatedLines.push('BEGIN:VEVENT');
    updatedLines.push(foldLine(`DTSTAMP:${event.DTSTAMP}`));
    updatedLines.push(foldLine(`DTSTART:${shiftedDtstart}`));
    updatedLines.push(foldLine(`DTEND:${shiftedDtend}`));
    updatedLines.push(foldLine(`SUMMARY:${escapeIcs(details.title)}`));
    updatedLines.push(foldLine(`DESCRIPTION:${escapeIcs(description)}`));
    updatedLines.push(foldLine(`CATEGORIES:${escapeIcs(category)}`));
    updatedLines.push('STATUS:CONFIRMED');
    updatedLines.push('TRANSP:TRANSPARENT');
    if (event['X-IMAGE']) {
      updatedLines.push(`X-IMAGE:${toAbsoluteImage(event['X-IMAGE'])}`);
    }
    updatedLines.push('END:VEVENT');
  });

  const finalContent = `${updatedLines.join('\n')}\nEND:VCALENDAR`;
  fs.writeFileSync(ICS_PATH, finalContent, 'utf8');
  if (fs.existsSync(path.dirname(DIST_ICS_PATH))) {
    fs.writeFileSync(DIST_ICS_PATH, finalContent, 'utf8');
  }
  console.log(`Enriched ${events.length} events in MSS.ics`);
}

if (require.main === module) {
  enrich();
}

module.exports = { enrich, EVENT_DETAILS };
