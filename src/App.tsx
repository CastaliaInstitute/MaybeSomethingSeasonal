import React, { useState, useEffect } from "react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Printer,
} from "lucide-react";
import "./App.css";

interface AlternateCalendarOccurrence {
  calendarSystem: string;
  descriptor: string;
  notes?: string;
}

interface CalendarRecurrenceRule {
  calendarSystem: string;
  rule: string;
  anchor?: string;
}

interface CalendarMetadata {
  alternateCalendars?: AlternateCalendarOccurrence[];
  recurrence?: CalendarRecurrenceRule;
}

interface CalendarEvent {
  title: string;
  date: string;
  description: string;
  icon: string;
  image?: string;
  category: string;
  endDate?: string;
  calendarMeta?: CalendarMetadata;
}

// Dishes named in an event's "Feasting:" line, mapped to recipe pages built
// by scripts/build-recipes.js (public/recipes/links.json).
interface RecipeLink {
  text: string;
  slug: string;
  dish: string;
}
type RecipeLinks = Record<string, RecipeLink[]>;

const toLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date(NaN);
  if (!dateString.includes("T")) {
    const [year, month, day] = dateString.split("-").map(Number);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day)
    ) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateString);
};

const parseCalendarMeta = (
  value?: string,
): CalendarMetadata | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as CalendarMetadata;
    }
  } catch (error) {
    if (isDevMode()) {
      console.warn("Failed to parse calendar metadata:", error, value);
    }
  }
  return undefined;
};

// MSS.ics is the source of truth
// This CALENDAR_DATA is kept as fallback only if MSS.ics fails to load
const CALENDAR_DATA: CalendarEvent[] = [
  // January
  {
    title: "New Year's Day",
    date: "2025-01-01",
    description: "Celebration of the new year and fresh beginnings.",
    icon: "🎊",
    image: "/images/image1.jpg",
    category: "celebration",
  },
  {
    title: "St. Basil & St. Gregory",
    date: "2025-01-02",
    description: "Doctors of the Church, Cappadocian Fathers.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "Berchtoldstag",
    date: "2025-01-02",
    description:
      "Swiss day of sharing bread and community visits following the New Year.",
    icon: "🍞",
    category: "cultural",
  },
  {
    title: "Most Holy Name of Jesus",
    date: "2025-01-03",
    description: "Optional memorial of the Holy Name of Jesus.",
    icon: "✝️",
    category: "religious",
  },
  {
    title: "St. Elizabeth Ann Seton",
    date: "2025-01-04",
    description: "First American-born saint, founder of Sisters of Charity.",
    icon: "👩‍🏫",
    category: "religious",
  },
  {
    title: "St. John Neumann",
    date: "2025-01-05",
    description: "Bishop of Philadelphia, patron of Catholic education.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Epiphany of the Lord",
    date: "2025-01-06",
    description: "Manifestation of Christ to the Gentiles.",
    icon: "⭐",
    image: "/images/image2.jpg",
    category: "religious",
  },
  {
    title: "St. Raymond of Penyafort",
    date: "2025-01-07",
    description: "Dominican priest, patron of canon lawyers.",
    icon: "⚖️",
    category: "religious",
  },
  {
    title: "St. Apollinaris",
    date: "2025-01-08",
    description: "Bishop and martyr, patron of Ravenna.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Baptism of the Lord",
    date: "2025-01-12",
    description: "End of Christmas season, Jesus baptized by John.",
    icon: "💧",
    category: "religious",
  },
  {
    title: "St. Hilary of Poitiers",
    date: "2025-01-13",
    description: "Doctor of the Church, defender against Arianism.",
    icon: "🛡️",
    category: "religious",
  },
  {
    title: "St. Felix of Nola",
    date: "2025-01-14",
    description: "Priest and confessor, patron of Nola.",
    icon: "🌿",
    category: "religious",
  },
  {
    title: "Feast of the Ass",
    date: "2025-01-14",
    description:
      "Medieval celebration recalling the Flight into Egypt (donkey).",
    icon: "🫏",
    category: "cultural",
  },
  {
    title: "St. Paul the Hermit",
    date: "2025-01-15",
    description: "First Christian hermit, patron of hermits.",
    icon: "🏔️",
    category: "religious",
  },
  {
    title: "St. Marcellus I",
    date: "2025-01-16",
    description: "Pope and martyr, 30th Pope of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Anthony of Egypt",
    date: "2025-01-17",
    description: "Father of monasticism, desert hermit.",
    icon: "🏜️",
    category: "religious",
  },
  {
    title: "St. Prisca",
    date: "2025-01-18",
    description: "Virgin and martyr, patron of Rome.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Canute",
    date: "2025-01-19",
    description: "King of Denmark, martyr for justice.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Fabian & St. Sebastian",
    date: "2025-01-20",
    description: "Pope and martyr, soldier and martyr.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Agnes",
    date: "2025-01-21",
    description: "Virgin and martyr, patron of young girls.",
    icon: "👧",
    category: "religious",
  },
  {
    title: "St. Vincent",
    date: "2025-01-22",
    description: "Deacon and martyr, patron of charitable societies.",
    icon: "🤝",
    category: "religious",
  },
  {
    title: "St. Ildephonsus",
    date: "2025-01-23",
    description: "Archbishop of Toledo, Marian theologian.",
    icon: "📖",
    category: "religious",
  },
  {
    title: "St. Francis de Sales",
    date: "2025-01-24",
    description: "Bishop and Doctor of the Church, patron of writers.",
    icon: "✍️",
    category: "religious",
  },
  {
    title: "Conversion of St. Paul",
    date: "2025-01-25",
    description: "Apostle to the Gentiles, feast of conversion.",
    icon: "🛣️",
    category: "religious",
  },
  {
    title: "St. Timothy & St. Titus",
    date: "2025-01-26",
    description: "Bishops and disciples of St. Paul.",
    icon: "📜",
    category: "religious",
  },
  {
    title: "St. Angela Merici",
    date: "2025-01-27",
    description: "Founder of Ursulines, patron of educators.",
    icon: "👩‍🎓",
    category: "religious",
  },
  {
    title: "St. Thomas Aquinas",
    date: "2025-01-28",
    description: "Dominican priest, Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Gildas",
    date: "2025-01-29",
    description: "Monk and historian, patron of Wales.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Martina",
    date: "2025-01-30",
    description: "Virgin and martyr, patron of Rome.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. John Bosco",
    date: "2025-01-31",
    description: "Founder of Salesians, patron of youth.",
    icon: "👦",
    category: "religious",
  },

  // February
  {
    title: "St. Brigid of Ireland",
    date: "2025-02-01",
    description: "Abbess and patron saint of Ireland.",
    icon: "🍀",
    category: "religious",
  },
  {
    title: "Presentation of the Lord",
    date: "2025-02-02",
    description: "Candlemas - Jesus presented in the Temple.",
    icon: "🕯️",
    category: "religious",
  },
  {
    title: "Candlemas",
    date: "2025-02-02",
    description: "Feast of the Presentation of Jesus and blessing of candles.",
    icon: "🕯️",
    category: "religious",
  },
  {
    title: "St. Blaise",
    date: "2025-02-03",
    description: "Bishop and martyr, patron of throat ailments.",
    icon: "🫁",
    category: "religious",
  },
  {
    title: "St. Andrew Corsini",
    date: "2025-02-04",
    description: "Carmelite bishop, patron of Florence.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Agatha",
    date: "2025-02-05",
    description: "Virgin and martyr, patron of breast cancer patients.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Paul Miki & Companions",
    date: "2025-02-06",
    description: "Japanese martyrs, first martyrs of Japan.",
    icon: "🇯🇵",
    category: "religious",
  },
  {
    title: "St. Colette",
    date: "2025-02-07",
    description: "Poor Clare nun, reformer of Franciscan order.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Jerome Emiliani",
    date: "2025-02-08",
    description: "Founder of Somaschi, patron of orphans.",
    icon: "👶",
    category: "religious",
  },
  {
    title: "St. Apollonia",
    date: "2025-02-09",
    description: "Virgin and martyr, patron of dentists.",
    icon: "🦷",
    category: "religious",
  },
  {
    title: "St. Scholastica",
    date: "2025-02-10",
    description: "Twin sister of St. Benedict, patron of nuns.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "Our Lady of Lourdes",
    date: "2025-02-11",
    description: "Apparition to St. Bernadette, patron of sick.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Julian the Hospitaller",
    date: "2025-02-12",
    description: "Patron of travelers and innkeepers.",
    icon: "🏨",
    category: "religious",
  },
  {
    title: "St. Catherine de Ricci",
    date: "2025-02-13",
    description: "Dominican nun, mystic and stigmatic.",
    icon: "✝️",
    category: "religious",
  },
  {
    title: "St. Valentine",
    date: "2025-02-14",
    description: "Priest and martyr, patron of love.",
    icon: "💕",
    category: "religious",
  },
  {
    title: "St. Onesimus",
    date: "2025-02-15",
    description: "Disciple of St. Paul, patron of slaves.",
    icon: "🔗",
    category: "religious",
  },
  {
    title: "St. Juliana",
    date: "2025-02-16",
    description: "Virgin and martyr, patron of sickness.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "Seven Founders of Servites",
    date: "2025-02-17",
    description: "Founders of Order of Servants of Mary.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Simeon",
    date: "2025-02-18",
    description: "Bishop and martyr, patron of Jerusalem.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Conrad of Piacenza",
    date: "2025-02-19",
    description: "Hermit and penitent, patron of Piacenza.",
    icon: "🏔️",
    category: "religious",
  },
  {
    title: "St. Eucherius",
    date: "2025-02-20",
    description: "Bishop of Orleans, patron of Orleans.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Peter Damian",
    date: "2025-02-21",
    description: "Cardinal and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Chair of St. Peter",
    date: "2025-02-22",
    description: "Feast of the authority of St. Peter.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Polycarp",
    date: "2025-02-23",
    description: "Bishop and martyr, disciple of St. John.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Matthias",
    date: "2025-02-24",
    description: "Apostle chosen to replace Judas.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Walburga",
    date: "2025-02-25",
    description: "Benedictine abbess, patron of Germany.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Porphyry",
    date: "2025-02-26",
    description: "Bishop of Gaza, patron of Gaza.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Gabriel of Our Lady of Sorrows",
    date: "2025-02-27",
    description: "Passionist student, patron of students.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Romanus",
    date: "2025-02-28",
    description: "Abbot and founder of Condat Abbey.",
    icon: "🏔️",
    category: "religious",
  },

  // March
  {
    title: "St. David of Wales",
    date: "2025-03-01",
    description: "Bishop and patron saint of Wales.",
    icon: "🌼",
    category: "religious",
  },
  {
    title: "St. Chad",
    date: "2025-03-02",
    description: "Bishop of Lichfield, patron of Birmingham.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Katharine Drexel",
    date: "2025-03-03",
    description: "Founder of Sisters of Blessed Sacrament.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Casimir",
    date: "2025-03-04",
    description: "Prince of Poland, patron of Poland.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. John Joseph of the Cross",
    date: "2025-03-05",
    description: "Franciscan priest, patron of Naples.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Colette",
    date: "2025-03-06",
    description: "Poor Clare nun, reformer of Franciscan order.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Perpetua & St. Felicity",
    date: "2025-03-07",
    description: "Martyrs of Carthage, patrons of mothers.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. John of God",
    date: "2025-03-08",
    description: "Founder of Hospitallers, patron of hospitals.",
    icon: "🏥",
    category: "religious",
  },
  {
    title: "St. Frances of Rome",
    date: "2025-03-09",
    description: "Founder of Oblates, patron of widows.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Simplicius",
    date: "2025-03-10",
    description: "Pope and defender against Monophysitism.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Eulogius",
    date: "2025-03-11",
    description: "Archbishop of Cordoba, martyr.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Maximilian",
    date: "2025-03-12",
    description: "Bishop and martyr, patron of Numidia.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Euphrasia",
    date: "2025-03-13",
    description: "Virgin and nun, patron of Constantinople.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Matilda",
    date: "2025-03-14",
    description: "Queen and saint, patron of large families.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Longinus",
    date: "2025-03-15",
    description: "Centurion who pierced Christ's side.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Patrick",
    date: "2025-03-17",
    description: "Bishop and patron saint of Ireland.",
    icon: "☘️",
    category: "religious",
  },
  {
    title: "St. Cyril of Jerusalem",
    date: "2025-03-18",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Joseph, Spouse of Mary",
    date: "2025-03-19",
    description: "Patron of the Universal Church.",
    icon: "🔨",
    category: "religious",
  },
  {
    title: "St. Cuthbert",
    date: "2025-03-20",
    description: "Bishop of Lindisfarne, patron of Northumbria.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Benedict",
    date: "2025-03-21",
    description: "Founder of Benedictine order, patron of Europe.",
    icon: "📖",
    category: "religious",
  },
  {
    title: "St. Lea",
    date: "2025-03-22",
    description: "Widow and nun, patron of widows.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Turibius",
    date: "2025-03-23",
    description: "Archbishop of Lima, patron of Peru.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Catherine of Sweden",
    date: "2025-03-24",
    description: "Bridgettine nun, patron of Sweden.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "Annunciation of the Lord",
    date: "2025-03-25",
    description: "Angel Gabriel announces to Mary.",
    icon: "👼",
    category: "religious",
  },
  {
    title: "St. Margaret Clitherow",
    date: "2025-03-26",
    description: "Martyr of England, patron of businesswomen.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Rupert",
    date: "2025-03-27",
    description: "Bishop of Salzburg, patron of Salzburg.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Hesychius",
    date: "2025-03-28",
    description: "Monk and martyr, patron of Jerusalem.",
    icon: "🏔️",
    category: "religious",
  },
  {
    title: "St. Berthold",
    date: "2025-03-29",
    description: "Carmelite prior, patron of Carmelites.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John Climacus",
    date: "2025-03-30",
    description: "Monk and abbot, author of Ladder of Divine Ascent.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Cornelia",
    date: "2025-03-31",
    description: "Virgin and martyr, patron of Rome.",
    icon: "🌹",
    category: "religious",
  },

  // April
  {
    title: "St. Hugh",
    date: "2025-04-01",
    description: "Bishop of Grenoble, patron of Grenoble.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Francis of Paola",
    date: "2025-04-02",
    description: "Founder of Minims, patron of Calabria.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Richard of Chichester",
    date: "2025-04-03",
    description: "Bishop of Chichester, patron of Sussex.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Isidore of Seville",
    date: "2025-04-04",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Vincent Ferrer",
    date: "2025-04-05",
    description: "Dominican priest, patron of builders.",
    icon: "🔨",
    category: "religious",
  },
  {
    title: "St. William of Eskilsoe",
    date: "2025-04-06",
    description: "Abbot and reformer, patron of Denmark.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John Baptist de la Salle",
    date: "2025-04-07",
    description: "Founder of Christian Brothers, patron of teachers.",
    icon: "👨‍🏫",
    category: "religious",
  },
  {
    title: "Annunciation of the Lord",
    date: "2025-04-08",
    description: "Angel Gabriel announces to Mary (transferred).",
    icon: "👼",
    category: "religious",
  },
  {
    title: "St. Casilda",
    date: "2025-04-09",
    description: "Virgin and hermit, patron of Toledo.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Fulbert",
    date: "2025-04-10",
    description: "Bishop of Chartres, patron of Chartres.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Stanislaus",
    date: "2025-04-11",
    description: "Bishop and martyr, patron of Poland.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Zeno",
    date: "2025-04-12",
    description: "Bishop of Verona, patron of Verona.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Martin I",
    date: "2025-04-13",
    description: "Pope and martyr, defender of orthodoxy.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Lydwina",
    date: "2025-04-14",
    description: "Virgin and mystic, patron of skaters.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Hunna",
    date: "2025-04-15",
    description: "Noblewoman and saint, patron of laundresses.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Bernadette",
    date: "2025-04-16",
    description: "Visionary of Lourdes, patron of illness.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Anicetus",
    date: "2025-04-17",
    description: "Pope and martyr, 11th Pope of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Apollonius",
    date: "2025-04-18",
    description: "Philosopher and martyr, patron of philosophers.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Leo IX",
    date: "2025-04-19",
    description: "Pope and reformer, patron of reform.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "Easter Sunday",
    date: "2025-04-20",
    description:
      "Resurrection of Jesus Christ, the most important Christian feast.",
    icon: "🐣",
    category: "religious",
  },
  {
    title: "St. Anselm",
    date: "2025-04-21",
    description: "Archbishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Earth Day",
    date: "2025-04-22",
    description: "Celebrate our planet and environmental awareness.",
    icon: "🌍",
    category: "environmental",
  },
  {
    title: "St. George",
    date: "2025-04-23",
    description: "Martyr and patron saint of England.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Fidelis of Sigmaringen",
    date: "2025-04-24",
    description: "Capuchin priest and martyr.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Mark",
    date: "2025-04-25",
    description: "Evangelist and patron saint of Venice.",
    icon: "📖",
    category: "religious",
  },
  {
    title: "St. Cletus",
    date: "2025-04-26",
    description: "Pope and martyr, 3rd Pope of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Zita",
    date: "2025-04-27",
    description: "Virgin and servant, patron of servants.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Peter Chanel",
    date: "2025-04-28",
    description: "Marist priest and martyr, patron of Oceania.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Catherine of Siena",
    date: "2025-04-29",
    description: "Dominican nun and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Pius V",
    date: "2025-04-30",
    description: "Pope and reformer, patron of the Dominican order.",
    icon: "👑",
    category: "religious",
  },

  // May
  {
    title: "St. Joseph the Worker",
    date: "2025-05-01",
    description: "Patron saint of workers and fathers.",
    icon: "🔨",
    category: "religious",
  },
  {
    title: "St. Athanasius",
    date: "2025-05-02",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Philip & St. James",
    date: "2025-05-03",
    description: "Apostles and martyrs.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Monica",
    date: "2025-05-04",
    description: "Mother of St. Augustine, patron of mothers.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Pius V",
    date: "2025-05-05",
    description: "Pope and reformer, patron of the Dominican order.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Evodius",
    date: "2025-05-06",
    description: "Bishop of Antioch, successor to St. Peter.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Rose Venerini",
    date: "2025-05-07",
    description: "Founder of Venerini Sisters, patron of educators.",
    icon: "👩‍🎓",
    category: "religious",
  },
  {
    title: "St. Victor",
    date: "2025-05-08",
    description: "Martyr and patron of Milan.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Pachomius",
    date: "2025-05-09",
    description: "Founder of cenobitic monasticism.",
    icon: "🏔️",
    category: "religious",
  },
  {
    title: "St. Antoninus",
    date: "2025-05-10",
    description: "Dominican archbishop, patron of Florence.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Ignatius of Laconi",
    date: "2025-05-11",
    description: "Capuchin lay brother, patron of Sardinia.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Nereus & St. Achilleus",
    date: "2025-05-12",
    description: "Martyrs and soldiers, patrons of Rome.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "Our Lady of Fatima",
    date: "2025-05-13",
    description: "Apparition to three shepherd children.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Matthias",
    date: "2025-05-14",
    description: "Apostle chosen to replace Judas.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Isidore the Farmer",
    date: "2025-05-15",
    description: "Layman and saint, patron of farmers.",
    icon: "🌾",
    category: "religious",
  },
  {
    title: "St. Simon Stock",
    date: "2025-05-16",
    description: "Carmelite prior, patron of Carmelites.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Paschal Baylon",
    date: "2025-05-17",
    description: "Franciscan lay brother, patron of Eucharistic congresses.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John I",
    date: "2025-05-18",
    description: "Pope and martyr, 53rd Pope of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Celestine V",
    date: "2025-05-19",
    description: "Pope and hermit, patron of bookbinders.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Bernardine of Siena",
    date: "2025-05-20",
    description: "Franciscan priest, patron of public relations.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Christopher Magallanes",
    date: "2025-05-21",
    description: "Priest and martyr, patron of Mexico.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Rita of Cascia",
    date: "2025-05-22",
    description: "Augustinian nun, patron of impossible causes.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Ivo",
    date: "2025-05-23",
    description: "Priest and lawyer, patron of lawyers.",
    icon: "⚖️",
    category: "religious",
  },
  {
    title: "St. Vincent of Lerins",
    date: "2025-05-24",
    description: "Monk and theologian, patron of theologians.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Bede the Venerable",
    date: "2025-05-25",
    description: "Monk and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Philip Neri",
    date: "2025-05-26",
    description: "Founder of Oratorians, patron of joy.",
    icon: "😊",
    category: "religious",
  },
  {
    title: "St. Augustine of Canterbury",
    date: "2025-05-27",
    description: "Bishop and missionary, patron of England.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Germanus",
    date: "2025-05-28",
    description: "Bishop of Paris, patron of Paris.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Madeleine Sophie Barat",
    date: "2025-05-29",
    description: "Founder of Sacred Heart Sisters.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Joan of Arc",
    date: "2025-05-30",
    description: "Virgin and martyr, patron of France.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "Visitation of the Blessed Virgin Mary",
    date: "2025-05-31",
    description: "Mary visits Elizabeth, patron of pregnant women.",
    icon: "👩‍👧",
    category: "religious",
  },

  // June
  {
    title: "St. Justin",
    date: "2025-06-01",
    description: "Philosopher and martyr, patron of philosophers.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Marcellinus & St. Peter",
    date: "2025-06-02",
    description: "Martyrs and patrons of Rome.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Charles Lwanga & Companions",
    date: "2025-06-03",
    description: "Ugandan martyrs, patrons of Africa.",
    icon: "🇺🇬",
    category: "religious",
  },
  {
    title: "St. Francis Caracciolo",
    date: "2025-06-04",
    description: "Founder of Minor Clerics Regular.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Boniface",
    date: "2025-06-05",
    description: "Bishop and martyr, patron of Germany.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Norbert",
    date: "2025-06-06",
    description: "Founder of Premonstratensians.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Robert",
    date: "2025-06-07",
    description: "Abbot of Citeaux, founder of Cistercians.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Medard",
    date: "2025-06-08",
    description: "Bishop of Noyon, patron of farmers.",
    icon: "🌾",
    category: "religious",
  },
  {
    title: "St. Ephrem",
    date: "2025-06-09",
    description: "Deacon and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Getulius",
    date: "2025-06-10",
    description: "Martyr and patron of Sabina.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Barnabas",
    date: "2025-06-11",
    description: "Apostle and companion of St. Paul.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. John of Sahagun",
    date: "2025-06-12",
    description: "Augustinian priest, patron of Salamanca.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Anthony of Padua",
    date: "2025-06-13",
    description: "Franciscan priest, patron of lost things.",
    icon: "👜",
    category: "religious",
  },
  {
    title: "St. Basil the Great",
    date: "2025-06-14",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Vitus",
    date: "2025-06-15",
    description: "Martyr and patron of dancers.",
    icon: "💃",
    category: "religious",
  },
  {
    title: "St. John Francis Regis",
    date: "2025-06-16",
    description: "Jesuit priest, patron of lacemakers.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Avitus",
    date: "2025-06-17",
    description: "Bishop of Clermont, patron of Auvergne.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Ephrem",
    date: "2025-06-18",
    description: "Deacon and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Romuald",
    date: "2025-06-19",
    description: "Founder of Camaldolese order.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Silverius",
    date: "2025-06-20",
    description: "Pope and martyr, 58th Pope of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Aloysius Gonzaga",
    date: "2025-06-21",
    description: "Jesuit scholastic, patron of youth.",
    icon: "👦",
    category: "religious",
  },
  {
    title: "St. Paulinus of Nola",
    date: "2025-06-22",
    description: "Bishop and poet, patron of Nola.",
    icon: "📜",
    category: "religious",
  },
  {
    title: "St. Joseph Cafasso",
    date: "2025-06-23",
    description: "Priest and teacher, patron of prisoners.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Nativity of St. John the Baptist",
    date: "2025-06-24",
    description: "Birth of St. John the Baptist.",
    icon: "🌅",
    category: "religious",
  },
  {
    title: "St. William",
    date: "2025-06-25",
    description: "Abbot and founder of Montevergine.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Josemaria Escriva",
    date: "2025-06-26",
    description: "Founder of Opus Dei, patron of ordinary work.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Cyril of Alexandria",
    date: "2025-06-27",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Irenaeus",
    date: "2025-06-28",
    description: "Bishop and martyr, patron of theologians.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Peter & St. Paul",
    date: "2025-06-29",
    description: "Apostles and martyrs, patrons of Rome.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "First Martyrs of Rome",
    date: "2025-06-30",
    description: "Early Christian martyrs of Rome.",
    icon: "⚔️",
    category: "religious",
  },

  // July
  {
    title: "St. Junipero Serra",
    date: "2025-07-01",
    description: "Franciscan missionary, founder of California missions.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Oliver Plunkett",
    date: "2025-07-01",
    description: "Archbishop and martyr, patron of Ireland.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Thomas",
    date: "2025-07-03",
    description: "Apostle and doubter, patron of architects.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "Independence Day",
    date: "2025-07-04",
    description: "Celebration of American independence.",
    icon: "🇺🇸",
    category: "cultural",
  },
  {
    title: "St. Anthony Zaccaria",
    date: "2025-07-05",
    description: "Founder of Barnabites, patron of physicians.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Maria Goretti",
    date: "2025-07-06",
    description: "Virgin and martyr, patron of purity.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Willibald",
    date: "2025-07-07",
    description: "Bishop and missionary, patron of Eichstätt.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Kilian",
    date: "2025-07-08",
    description: "Bishop and martyr, patron of Würzburg.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Augustine Zhao Rong",
    date: "2025-07-09",
    description: "Priest and martyr, patron of China.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Felicity",
    date: "2025-07-10",
    description: "Martyr and patron of mothers.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Benedict",
    date: "2025-07-11",
    description: "Founder of Benedictine order, patron of Europe.",
    icon: "📖",
    category: "religious",
  },
  {
    title: "St. Veronica",
    date: "2025-07-12",
    description: "Woman who wiped Jesus' face, patron of photographers.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Henry",
    date: "2025-07-13",
    description: "Emperor and saint, patron of Benedictine oblates.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Camillus de Lellis",
    date: "2025-07-14",
    description: "Founder of Camillians, patron of nurses.",
    icon: "🏥",
    category: "religious",
  },
  {
    title: "St. Bonaventure",
    date: "2025-07-15",
    description: "Franciscan bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Our Lady of Mount Carmel",
    date: "2025-07-16",
    description: "Patroness of Carmelites and scapular devotion.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Alexius",
    date: "2025-07-17",
    description: "Confessor and patron of beggars.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Frederick",
    date: "2025-07-18",
    description: "Bishop and martyr, patron of Utrecht.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Arsenius",
    date: "2025-07-19",
    description: "Monk and hermit, patron of teachers.",
    icon: "📚",
    category: "religious",
  },
  {
    title: "St. Apollinaris",
    date: "2025-07-20",
    description: "Bishop and martyr, patron of Ravenna.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Lawrence of Brindisi",
    date: "2025-07-21",
    description: "Capuchin priest and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Mary Magdalene",
    date: "2025-07-22",
    description: "Apostle to the apostles, witness to the resurrection.",
    icon: "🌿",
    category: "religious",
  },
  {
    title: "St. Bridget",
    date: "2025-07-23",
    description: "Founder of Bridgettines, patron of Sweden.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Sharbel",
    date: "2025-07-24",
    description: "Maronite monk and hermit, patron of Lebanon.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. James the Greater",
    date: "2025-07-25",
    description: "Apostle and martyr, patron of Spain.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Joachim & St. Anne",
    date: "2025-07-26",
    description: "Parents of the Blessed Virgin Mary.",
    icon: "👴👵",
    category: "religious",
  },
  {
    title: "St. Pantaleon",
    date: "2025-07-27",
    description: "Physician and martyr, patron of doctors.",
    icon: "⚕️",
    category: "religious",
  },
  {
    title: "St. Nazarius & St. Celsus",
    date: "2025-07-28",
    description: "Martyrs and patrons of Milan.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Martha",
    date: "2025-07-29",
    description: "Sister of Mary and Lazarus, patron of cooks.",
    icon: "👩‍🍳",
    category: "religious",
  },
  {
    title: "St. Peter Chrysologus",
    date: "2025-07-30",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Ignatius of Loyola",
    date: "2025-07-31",
    description: "Founder of Jesuits, patron of retreats.",
    icon: "⛪",
    category: "religious",
  },

  // August
  {
    title: "St. Alphonsus Liguori",
    date: "2025-08-01",
    description: "Founder of Redemptorists, Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Eusebius",
    date: "2025-08-02",
    description: "Bishop and martyr, patron of Vercelli.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Lydia",
    date: "2025-08-03",
    description: "First European convert, patron of dyers.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. John Vianney",
    date: "2025-08-04",
    description: "Curé of Ars, patron of parish priests.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Dedication of St. Mary Major",
    date: "2025-08-05",
    description: "Basilica dedicated to the Blessed Virgin Mary.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Transfiguration of the Lord",
    date: "2025-08-06",
    description: "Jesus is transfigured on Mount Tabor.",
    icon: "✨",
    category: "religious",
  },
  {
    title: "St. Sixtus II",
    date: "2025-08-07",
    description: "Pope and martyr, patron of Rome.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Dominic",
    date: "2025-08-08",
    description: "Founder of Dominicans, patron of astronomers.",
    icon: "⭐",
    category: "religious",
  },
  {
    title: "St. Teresa Benedicta",
    date: "2025-08-09",
    description: "Carmelite nun and martyr, patron of Europe.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Lawrence",
    date: "2025-08-10",
    description: "Deacon and martyr, patron of cooks.",
    icon: "🔥",
    category: "religious",
  },
  {
    title: "St. Clare",
    date: "2025-08-11",
    description: "Founder of Poor Clares, patron of television.",
    icon: "📺",
    category: "religious",
  },
  {
    title: "St. Jane Frances de Chantal",
    date: "2025-08-12",
    description: "Founder of Visitation Sisters, patron of widows.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Pontian & St. Hippolytus",
    date: "2025-08-13",
    description: "Pope and priest, martyrs of Rome.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Maximilian Kolbe",
    date: "2025-08-14",
    description: "Franciscan priest and martyr, patron of prisoners.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Assumption of the Blessed Virgin Mary",
    date: "2025-08-15",
    description: "Mary is assumed body and soul into heaven.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Stephen of Hungary",
    date: "2025-08-16",
    description: "King and saint, patron of Hungary.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Hyacinth",
    date: "2025-08-17",
    description: "Dominican priest, patron of Poland.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Helena",
    date: "2025-08-18",
    description: "Empress and saint, finder of the True Cross.",
    icon: "✝️",
    category: "religious",
  },
  {
    title: "St. John Eudes",
    date: "2025-08-19",
    description: "Founder of Eudists, patron of France.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Bernard",
    date: "2025-08-20",
    description: "Cistercian abbot and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Pius X",
    date: "2025-08-21",
    description: "Pope and saint, patron of first communicants.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "Queenship of Mary",
    date: "2025-08-22",
    description: "Mary as Queen of Heaven and Earth.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Rose of Lima",
    date: "2025-08-23",
    description: "Dominican tertiary, patron of Peru.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Bartholomew",
    date: "2025-08-24",
    description: "Apostle and martyr, patron of tanners.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Louis IX",
    date: "2025-08-25",
    description: "King of France, patron of France.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Joseph Calasanz",
    date: "2025-08-26",
    description: "Founder of Piarists, patron of schools.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Monica",
    date: "2025-08-27",
    description: "Mother of St. Augustine, patron of mothers.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Augustine",
    date: "2025-08-28",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Martyrdom of St. John the Baptist",
    date: "2025-08-29",
    description: "Beheading of St. John the Baptist.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Jeanne Jugan",
    date: "2025-08-30",
    description: "Founder of Little Sisters of the Poor.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Aidan",
    date: "2025-08-31",
    description: "Bishop and missionary, patron of Northumbria.",
    icon: "⛪",
    category: "religious",
  },

  // September
  {
    title: "St. Giles",
    date: "2025-09-01",
    description: "Abbot and hermit, patron of cripples.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Ingrid",
    date: "2025-09-02",
    description: "Dominican nun, patron of Sweden.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Gregory the Great",
    date: "2025-09-03",
    description: "Pope and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Rosalia",
    date: "2025-09-04",
    description: "Virgin and hermit, patron of Palermo.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Teresa of Calcutta",
    date: "2025-09-05",
    description: "Founder of Missionaries of Charity.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Eleutherius",
    date: "2025-09-06",
    description: "Bishop and martyr, patron of Spoleto.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Cloud",
    date: "2025-09-07",
    description: "Abbot and hermit, patron of France.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Nativity of the Blessed Virgin Mary",
    date: "2025-09-08",
    description: "Birth of the Blessed Virgin Mary.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Peter Claver",
    date: "2025-09-09",
    description: "Jesuit priest, patron of slaves.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Nicholas of Tolentino",
    date: "2025-09-10",
    description: "Augustinian priest, patron of souls in purgatory.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John Gabriel Perboyre",
    date: "2025-09-11",
    description: "Vincentian priest and martyr, patron of China.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Most Holy Name of Mary",
    date: "2025-09-12",
    description: "Feast of the Holy Name of Mary.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. John Chrysostom",
    date: "2025-09-13",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Exaltation of the Holy Cross",
    date: "2025-09-14",
    description: "Feast of the Triumph of the Cross.",
    icon: "✝️",
    category: "religious",
  },
  {
    title: "Our Lady of Sorrows",
    date: "2025-09-15",
    description: "Mary's seven sorrows, patron of suffering.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Cornelius & St. Cyprian",
    date: "2025-09-16",
    description: "Pope and bishop, martyrs of Rome.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Robert Bellarmine",
    date: "2025-09-17",
    description: "Jesuit cardinal and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Joseph of Cupertino",
    date: "2025-09-18",
    description: "Franciscan priest, patron of aviators.",
    icon: "✈️",
    category: "religious",
  },
  {
    title: "St. Januarius",
    date: "2025-09-19",
    description: "Bishop and martyr, patron of Naples.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Andrew Kim Taegon & Companions",
    date: "2025-09-20",
    description: "Korean martyrs, patrons of Korea.",
    icon: "🇰🇷",
    category: "religious",
  },
  {
    title: "St. Matthew",
    date: "2025-09-21",
    description: "Evangelist and former tax collector.",
    icon: "📊",
    category: "religious",
  },
  {
    title: "Autumn Equinox",
    date: "2025-09-22",
    description: "Fall begins - time for harvest and reflection.",
    icon: "🍂",
    category: "seasonal",
  },
  {
    title: "St. Pio of Pietrelcina",
    date: "2025-09-23",
    description: "Capuchin priest and stigmatic, patron of volunteers.",
    icon: "✝️",
    category: "religious",
  },
  {
    title: "St. Gerard Sagredo",
    date: "2025-09-24",
    description: "Benedictine monk and martyr, patron of Hungary.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Finbar",
    date: "2025-09-25",
    description: "Bishop and founder, patron of Cork.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Cosmas & St. Damian",
    date: "2025-09-26",
    description: "Physicians and martyrs, patrons of doctors.",
    icon: "⚕️",
    category: "religious",
  },
  {
    title: "St. Vincent de Paul",
    date: "2025-09-27",
    description: "Founder of Vincentians, patron of charities.",
    icon: "🤝",
    category: "religious",
  },
  {
    title: "St. Wenceslaus",
    date: "2025-09-28",
    description: "Duke and martyr, patron of Bohemia.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Michael, St. Gabriel & St. Raphael",
    date: "2025-09-29",
    description: "Archangels, patrons of protection and healing.",
    icon: "👼",
    category: "religious",
  },
  {
    title: "St. Jerome",
    date: "2025-09-30",
    description: "Priest and Doctor of the Church, translator of Bible.",
    icon: "🎓",
    category: "religious",
  },

  // October
  {
    title: "St. Thérèse of Lisieux",
    date: "2025-10-01",
    description: "Carmelite nun and Doctor of the Church.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "Guardian Angels",
    date: "2025-10-02",
    description: "Feast of the Guardian Angels.",
    icon: "👼",
    category: "religious",
  },
  {
    title: "St. Francis of Assisi",
    date: "2025-10-04",
    description: "Founder of Franciscans, patron of animals.",
    icon: "🐦",
    category: "religious",
  },
  {
    title: "St. Faustina Kowalska",
    date: "2025-10-05",
    description: "Apostle of Divine Mercy, patron of mercy.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Bruno",
    date: "2025-10-06",
    description: "Founder of Carthusians, patron of exorcists.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Our Lady of the Rosary",
    date: "2025-10-07",
    description: "Feast of Our Lady of the Rosary.",
    icon: "📿",
    category: "religious",
  },
  {
    title: "St. Pelagia",
    date: "2025-10-08",
    description: "Virgin and martyr, patron of actresses.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Denis",
    date: "2025-10-09",
    description: "Bishop and martyr, patron of France.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Francis Borgia",
    date: "2025-10-10",
    description: "Jesuit priest, patron of Portugal.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John XXIII",
    date: "2025-10-11",
    description: "Pope and saint, convener of Vatican II.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Seraphin",
    date: "2025-10-12",
    description: "Capuchin lay brother, patron of Italy.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Edward the Confessor",
    date: "2025-10-13",
    description: "King of England, patron of England.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Callistus I",
    date: "2025-10-14",
    description: "Pope and martyr, patron of cemetery workers.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Teresa of Avila",
    date: "2025-10-15",
    description: "Carmelite nun and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Hedwig",
    date: "2025-10-16",
    description: "Duchess and saint, patron of Silesia.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Ignatius of Antioch",
    date: "2025-10-17",
    description: "Bishop and martyr, patron of the Church.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Luke",
    date: "2025-10-18",
    description: "Evangelist and physician, patron of artists.",
    icon: "🎨",
    category: "religious",
  },
  {
    title: "St. Isaac Jogues & Companions",
    date: "2025-10-19",
    description: "Jesuit martyrs, patrons of North America.",
    icon: "🇺🇸",
    category: "religious",
  },
  {
    title: "St. Paul of the Cross",
    date: "2025-10-20",
    description: "Founder of Passionists, patron of Italy.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Ursula",
    date: "2025-10-21",
    description: "Virgin and martyr, patron of students.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. John Paul II",
    date: "2025-10-22",
    description: "Pope and saint, patron of families.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. John of Capistrano",
    date: "2025-10-23",
    description: "Franciscan priest, patron of military chaplains.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Anthony Claret",
    date: "2025-10-24",
    description: "Founder of Claretians, patron of textile workers.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Crispin & St. Crispinian",
    date: "2025-10-25",
    description: "Martyrs and patrons of shoemakers.",
    icon: "👟",
    category: "religious",
  },
  {
    title: "St. Cedd",
    date: "2025-10-26",
    description: "Bishop and missionary, patron of Essex.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Frumentius",
    date: "2025-10-27",
    description: "Bishop and missionary, patron of Ethiopia.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Simon & St. Jude",
    date: "2025-10-28",
    description: "Apostles and martyrs, patrons of lost causes.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "St. Narcissus",
    date: "2025-10-29",
    description: "Bishop and martyr, patron of Jerusalem.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Marcellus",
    date: "2025-10-30",
    description: "Centurion and martyr, patron of Spain.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "Halloween",
    date: "2025-10-31",
    description: "All Hallows' Eve, celebration of saints and departed souls.",
    icon: "🎃",
    category: "celebration",
  },

  // November
  {
    title: "Día de los Muertos",
    date: "2025-11-01",
    description: "Day of the Dead - celebration of deceased loved ones.",
    icon: "💀",
    image: "/images/image6.png",
    category: "cultural",
  },
  {
    title: "All Saints' Day",
    date: "2025-11-01",
    description: "Celebration of all the saints in heaven.",
    icon: "👼",
    category: "religious",
  },
  {
    title: "All Souls' Day",
    date: "2025-11-02",
    description: "Prayer for the faithful departed.",
    icon: "🕊️",
    category: "religious",
  },
  {
    title: "St. Martin de Porres",
    date: "2025-11-03",
    description: "Dominican lay brother, patron of social justice.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Charles Borromeo",
    date: "2025-11-04",
    description: "Archbishop and reformer, patron of seminarians.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Elizabeth",
    date: "2025-11-05",
    description: "Mother of St. John the Baptist, patron of pregnant women.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Leonard",
    date: "2025-11-06",
    description: "Abbot and hermit, patron of prisoners.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Willibrord",
    date: "2025-11-07",
    description: "Bishop and missionary, patron of Netherlands.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Godfrey",
    date: "2025-11-08",
    description: "Bishop and martyr, patron of Amiens.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Dedication of Lateran Basilica",
    date: "2025-11-09",
    description: "Mother and head of all churches.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Leo the Great",
    date: "2025-11-10",
    description: "Pope and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Martin of Tours",
    date: "2025-11-11",
    description: "Bishop and saint, patron of soldiers.",
    icon: "🪶",
    category: "religious",
  },
  {
    title: "St. Josaphat",
    date: "2025-11-12",
    description: "Bishop and martyr, patron of unity.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Frances Xavier Cabrini",
    date: "2025-11-13",
    description: "Founder of Missionary Sisters, patron of immigrants.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Lawrence O'Toole",
    date: "2025-11-14",
    description: "Archbishop of Dublin, patron of Ireland.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Albert the Great",
    date: "2025-11-15",
    description: "Dominican bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Margaret of Scotland",
    date: "2025-11-16",
    description: "Queen and saint, patron of Scotland.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Elizabeth of Hungary",
    date: "2025-11-17",
    description: "Princess and saint, patron of hospitals.",
    icon: "🏥",
    category: "religious",
  },
  {
    title: "Dedication of Basilicas of St. Peter & St. Paul",
    date: "2025-11-18",
    description: "Feast of the dedication of Roman basilicas.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Mechtilde",
    date: "2025-11-19",
    description: "Benedictine nun and mystic, patron of Germany.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "St. Edmund",
    date: "2025-11-20",
    description: "King and martyr, patron of England.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "Presentation of the Blessed Virgin Mary",
    date: "2025-11-21",
    description: "Mary presented in the Temple as a child.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Cecilia",
    date: "2025-11-22",
    description: "Virgin and martyr, patron of musicians.",
    icon: "🎵",
    category: "religious",
  },
  {
    title: "St. Clement I",
    date: "2025-11-23",
    description: "Pope and martyr, patron of mariners.",
    icon: "⛵",
    category: "religious",
  },
  {
    title: "St. Chrysogonus",
    date: "2025-11-24",
    description: "Martyr and patron of Aquileia.",
    icon: "⚔️",
    category: "religious",
  },
  {
    title: "St. Catherine's Day",
    date: "2025-11-25",
    description:
      "Pour wax through an old key into cold water, read the candlelit shadow for omens, and whirl a St. Catherine's wheel procession.",
    icon: "🎡",
    category: "religious",
  },
  {
    title: "St. Leonard of Port Maurice",
    date: "2025-11-26",
    description: "Franciscan priest, patron of missions.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Thanksgiving",
    date: "2025-11-27",
    description: "Gratitude for the harvest and blessings of the year.",
    icon: "🦃",
    category: "celebration",
  },
  {
    title: "St. James of the Marches",
    date: "2025-11-28",
    description: "Franciscan priest, patron of Italy.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Saturninus",
    date: "2025-11-29",
    description: "Bishop and martyr, patron of Toulouse.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Handel Messiah",
    date: "2025-11-29",
    description: "Performance of Handel's Messiah oratorio.",
    icon: "🎵",
    category: "cultural",
  },
  {
    title: "St. Andrew",
    date: "2025-11-30",
    description: "Apostle and martyr, patron of Scotland.",
    icon: "👥",
    category: "religious",
  },
  {
    title: "Desnudar al Niño Dios",
    date: "2025-11-30",
    description:
      "First Sunday of Advent - traditional ceremony of undressing the Baby Jesus figure.",
    icon: "👶",
    category: "cultural",
  },

  // December
  {
    title: "St. Edmund Campion",
    date: "2025-12-01",
    description: "Jesuit priest and martyr, patron of England.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Bibiana",
    date: "2025-12-02",
    description: "Virgin and martyr, patron of Rome.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Francis Xavier",
    date: "2025-12-03",
    description: "Jesuit priest and missionary, patron of missions.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John Damascene",
    date: "2025-12-04",
    description: "Priest and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "St. Sabas",
    date: "2025-12-05",
    description: "Abbot and founder, patron of Palestine.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Nicholas",
    date: "2025-12-06",
    description: "Bishop and saint, patron of children and gift-giving.",
    icon: "🎁",
    image: "/images/image3.jpg",
    category: "religious",
  },
  {
    title: "St. Ambrose",
    date: "2025-12-07",
    description: "Bishop and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Tiki Christmas at Pearl Harbor",
    date: "2025-12-07",
    description:
      "Torchlit wreaths, ukulele carols, and island lights honour Pearl Harbor's legacy with festive aloha spirit.",
    icon: "🌺",
    image: "/images/image24.png",
    category: "cultural",
  },
  {
    title: "Immaculate Conception",
    date: "2025-12-08",
    description: "Mary conceived without original sin.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "Immaculada",
    date: "2025-12-08",
    description:
      "Feast of the Immaculate Conception; families set out the Caga Tio log and feed it sweets until Christmas Eve.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Juan Diego",
    date: "2025-12-09",
    description: "Visionary of Guadalupe, patron of Mexico.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Our Lady of Loreto",
    date: "2025-12-10",
    description: "Patroness of aviators and builders.",
    icon: "✈️",
    category: "religious",
  },
  {
    title: "St. Damasus I",
    date: "2025-12-11",
    description: "Pope and saint, patron of archaeologists.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "Our Lady of Guadalupe",
    date: "2025-12-12",
    description: "Patroness of the Americas and unborn children.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Lucy",
    date: "2025-12-13",
    description: "Virgin and martyr, patron of light and vision.",
    icon: "🕯️",
    image: "/images/image4.jpg",
    category: "religious",
  },
  {
    title: "St. John of the Cross",
    date: "2025-12-14",
    description: "Carmelite priest and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Palmer Lake Yule Log Hunt",
    date: "2025-12-14",
    description:
      "Annual tradition in Palmer Lake, Colorado: community yule log hunt and celebration.",
    icon: "🪵",
    category: "cultural",
  },
  {
    title: "St. Mary Di Rosa",
    date: "2025-12-15",
    description: "Founder of Handmaids of Charity.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "Palmer Lake Yule Log Hunt",
    date: "2025-12-15",
    description: "Traditional community Yule log hunt celebration.",
    icon: "🪵",
    category: "cultural",
  },
  {
    title: "Hanukkah - Night 1",
    date: "2025-12-15",
    description: "First night of Hanukkah - Festival of Lights begins.",
    icon: "🕎",
    category: "religious",
  },
  {
    title: "St. Adelaide",
    date: "2025-12-16",
    description: "Empress and saint, patron of abuse victims.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "Hanukkah - Night 2",
    date: "2025-12-16",
    description: "Second night of Hanukkah - Festival of Lights.",
    icon: "🕎",
    category: "religious",
  },
  {
    title: "St. Lazarus",
    date: "2025-12-17",
    description: "Friend of Jesus, patron of lepers.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Gatian",
    date: "2025-12-18",
    description: "Bishop and founder, patron of Tours.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Urban V",
    date: "2025-12-19",
    description: "Pope and saint, patron of Benedictines.",
    icon: "👑",
    category: "religious",
  },
  {
    title: "St. Dominic of Silos",
    date: "2025-12-20",
    description: "Abbot and saint, patron of prisoners.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Hanukkah - Night 6",
    date: "2025-12-20",
    description: "Sixth night of Hanukkah - Festival of Lights.",
    icon: "🕎",
    category: "religious",
  },
  {
    title: "St. Peter Canisius",
    date: "2025-12-21",
    description: "Jesuit priest and Doctor of the Church.",
    icon: "🎓",
    category: "religious",
  },
  {
    title: "Hanukkah - Night 7",
    date: "2025-12-21",
    description: "Seventh night of Hanukkah - Festival of Lights.",
    icon: "🕎",
    category: "religious",
  },
  {
    title: "Winter Solstice",
    date: "2025-12-21",
    description:
      "The shortest day - embrace the darkness and prepare for renewal.",
    icon: "❄️",
    category: "seasonal",
  },
  {
    title: "St. Frances Xavier Cabrini",
    date: "2025-12-22",
    description: "Founder of Missionary Sisters, patron of immigrants.",
    icon: "👩‍🦱",
    category: "religious",
  },
  {
    title: "Polaris Meteor Watch & UFO Evening",
    date: "2025-12-22",
    description:
      "Gather to scan for meteors near Polaris with whimsical UFO lanterns and midnight cocoa.",
    icon: "🛸",
    category: "seasonal",
    image: "/images/festive-ufo-meteor-watch.png",
  },
  {
    title: "Hanukkah - Night 8",
    date: "2025-12-22",
    description:
      "Eighth and final night of Hanukkah - Festival of Lights concludes.",
    icon: "🕎",
    category: "religious",
  },
  {
    title: "St. John of Kanty",
    date: "2025-12-23",
    description: "Priest and saint, patron of Poland.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Christmas Eve",
    date: "2025-12-24",
    description: "Vigil of the Nativity, anticipation of Christ's birth.",
    icon: "🌟",
    category: "religious",
    image: "/images/caga-tio.svg",
  },
  {
    title: "Christmas Day",
    date: "2025-12-25",
    description: "Birth of Jesus Christ, joy and celebration.",
    icon: "🎄",
    category: "celebration",
  },
  {
    title: "St. Stephen",
    date: "2025-12-26",
    description: "First Christian martyr, patron of deacons.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "Feast of St. Stefan",
    date: "2025-12-26",
    description: "Celebration of St. Stephen, the first martyr.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. John the Evangelist",
    date: "2025-12-27",
    description: "Apostle and evangelist, patron of writers.",
    icon: "📜",
    category: "religious",
  },
  {
    title: "Broadmoor Brunch",
    date: "2025-12-28",
    description: "Broadmoor Brunch at 9:00am.",
    icon: "🥂",
    image: "/images/broadmoor.jpg",
    category: "cultural",
  },
  {
    title: "Holy Innocents",
    date: "2025-12-28",
    description: "Commemoration of children killed by Herod.",
    icon: "👶",
    category: "religious",
  },
  {
    title: "Dermas",
    date: "2025-12-28",
    description: "Traditional celebration.",
    icon: "🎉",
    category: "cultural",
  },
  {
    title: "St. Thomas Becket",
    date: "2025-12-29",
    description: "Archbishop and martyr, patron of England.",
    icon: "⛪",
    category: "religious",
  },
  {
    title: "St. Anysia",
    date: "2025-12-30",
    description: "Virgin and martyr, patron of Thessalonica.",
    icon: "🌹",
    category: "religious",
  },
  {
    title: "St. Sylvester I",
    date: "2025-12-31",
    description: "Pope and saint, patron of New Year's Eve.",
    icon: "👑",
    category: "religious",
  },

  // Additional events from Excel file
  {
    title: "Krampusnacht",
    date: "2025-12-05",
    description: "Krampus Night - the dark companion of St. Nicholas.",
    icon: "👹",
    image: "/images/image5.png",
    category: "cultural",
  },
  {
    title: "Sinterklaas Arrival",
    date: "2025-11-16",
    description:
      "Sunday after St. Martin's Day when Sinterklaas docks with his Pieten to shower the Netherlands with pepernoten.",
    icon: "🚢",
    category: "cultural",
  },
  {
    title: "Lussi Day",
    date: "2025-12-13",
    description: "Swedish celebration of light and St. Lucia.",
    icon: "🕯️",
    category: "cultural",
  },
  {
    title: "Saturnalia",
    date: "2025-12-17",
    description: "Ancient Roman festival of Saturn.",
    icon: "🏛️",
    category: "cultural",
  },
  {
    title: "Día de los Reyes",
    date: "2025-01-06",
    description: "Three Kings Day - Epiphany celebration.",
    icon: "👑",
    category: "cultural",
  },
  {
    title: "Chinese New Year",
    date: "2025-01-29",
    description: "Lunar New Year celebration.",
    icon: "🐉",
    category: "cultural",
  },
  {
    title: "Imbolc",
    date: "2025-02-01",
    description: "Celtic festival marking the beginning of spring.",
    icon: "🌱",
    category: "seasonal",
  },
  {
    title: "Candelaria",
    date: "2025-02-02",
    description: "Candlemas - blessing of candles and purification.",
    icon: "🕯️",
    category: "religious",
  },
];

// Helper function to get base URL that works in both modern and legacy builds
// Vite replaces import.meta.env.BASE_URL at build time, but we need a runtime fallback for legacy builds
const getBaseUrl = (): string => {
  // Try to use Vite's BASE_URL (replaced at build time)
  // @ts-ignore - Vite replaces import.meta.env at build time
  const viteBaseUrl = (import.meta.env as { BASE_URL?: string })?.BASE_URL;
  if (viteBaseUrl) {
    return viteBaseUrl;
  }
  // Fallback: determine from window.location (works in all builds, especially legacy)
  const pathname = window.location.pathname;
  // If we're at /MaybeSomethingSeasonal/ or /MaybeSomethingSeasonal/index.html
  if (pathname.includes('/MaybeSomethingSeasonal')) {
    const match = pathname.match(/^(\/MaybeSomethingSeasonal\/?)/);
    if (match) {
      return match[1].endsWith('/') ? match[1] : match[1] + '/';
    }
  }
  // Default to root
  return '/';
};

// Helper to check if we're in dev mode
const isDevMode = (): boolean => {
  // @ts-ignore - Vite replaces import.meta.env at build time
  try {
    return (import.meta.env as { DEV?: boolean })?.DEV === true;
  } catch (e) {
    return false;
  }
};

const monthFromLocation = (): Date | null => {
  if (typeof window === "undefined") return null;
  const basePath = getBaseUrl().replace(/\/$/, "");
  const redirectPath = new URLSearchParams(window.location.search).get("route");
  const pathname = redirectPath || window.location.pathname;
  const match = pathname.match(
    new RegExp(`^${basePath.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}/(\\d{4})/(0?[1-9]|1[0-2])/?$`),
  );
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || year > 2100) return null;
  return new Date(year, month - 1, 1);
};

const canonicalMonthPath = (date: Date): string => {
  const basePath = getBaseUrl().replace(/\/$/, "");
  return `${basePath}/${format(date, "yyyy/MM")}`;
};

const App: React.FC = () => {
  // Check for kiosk mode via URL parameter or environment variable
  const isKioskMode = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('kiosk') === 'true' || params.get('kiosk') === '1') {
        return true;
      }
    }
    // @ts-ignore - Vite replaces this
    return (import.meta.env as { VITE_KIOSK_MODE?: string })?.VITE_KIOSK_MODE === 'true';
  })();

  // A canonical /YYYY/MM URL takes precedence; kiosk and current month remain
  // the fallbacks for the unqualified homepage.
  const initialDate =
    monthFromLocation() ||
    (isKioskMode ? new Date(2025, 11, 1) : new Date());
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recipeLinks, setRecipeLinks] = useState<RecipeLinks>({});
  const [agendaSlugs, setAgendaSlugs] = useState<Record<string, string>>({});
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  // On phones the per-event tap targets are tiny icons sharing one cell, so a
  // tap opens every event on that day; on larger screens a label is its own
  // target and opens just that event.
  const openEventCards = (event: CalendarEvent, dayEvents: CalendarEvent[]) => {
    const isNarrow =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    if (isNarrow && dayEvents.length > 1) {
      setSelectedEvents([
        event,
        ...dayEvents.filter((other) => other !== event),
      ]);
    } else {
      setSelectedEvents([event]);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"calendar" | "events">("calendar");

  const resolvedBaseUrl = getBaseUrl();
  const mssEventsUrl = resolvedBaseUrl.endsWith("/")
    ? `${resolvedBaseUrl}mss-events.html`
    : `${resolvedBaseUrl}/mss-events.html`;
  const recipesUrl = resolvedBaseUrl.endsWith("/")
    ? `${resolvedBaseUrl}recipes/`
    : `${resolvedBaseUrl}/recipes/`;

  const agendaUrl = resolvedBaseUrl.endsWith("/")
    ? `${resolvedBaseUrl}agenda/`
    : `${resolvedBaseUrl}/agenda/`;

  useEffect(() => {
    fetch(`${recipesUrl}links.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: RecipeLinks) => setRecipeLinks(data || {}))
      .catch(() => setRecipeLinks({}));
    fetch(`${recipesUrl}agendas.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, { slug: string }>) =>
        setAgendaSlugs(
          Object.fromEntries(
            Object.entries(data || {}).map(([title, a]) => [title, a.slug]),
          ),
        ),
      )
      .catch(() => setAgendaSlugs({}));
  }, [recipesUrl]);

  // Render a description, turning each dish named in the Feasting line into
  // a link to its recipe page.
  const renderDescription = (event: CalendarEvent) => {
    const dishes = recipeLinks[event.title] || [];
    return event.description.split("\n").map((line, lineIndex) => {
      const isFeasting = /^Feasting:/.test(line);
      if (!isFeasting || dishes.length === 0) {
        return (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && "\n"}
            {line}
          </React.Fragment>
        );
      }
      const parts: React.ReactNode[] = [];
      let cursor = 0;
      dishes
        .map((dish) => ({ ...dish, at: line.indexOf(dish.text, cursor) }))
        .filter((dish) => dish.at >= 0)
        .sort((a, b) => a.at - b.at)
        .forEach((dish) => {
          if (dish.at < cursor) return;
          parts.push(line.slice(cursor, dish.at));
          parts.push(
            <a
              key={`${dish.slug}-${dish.at}`}
              href={`${recipesUrl}${dish.slug}/`}
              className="recipe-link"
              target="_blank"
              rel="noopener"
              title={`Recipe: ${dish.dish}`}
            >
              {dish.text}
            </a>,
          );
          cursor = dish.at + dish.text.length;
        });
      parts.push(line.slice(cursor));
      return (
        <React.Fragment key={lineIndex}>
          {lineIndex > 0 && "\n"}
          {parts}
        </React.Fragment>
      );
    });
  };

  const showMonth = (date: Date, replace = false) => {
    const month = startOfMonth(date);
    setCurrentDate(month);
    const nextPath = canonicalMonthPath(month);
    if (replace) {
      window.history.replaceState({ month: nextPath }, "", nextPath);
    } else {
      window.history.pushState({ month: nextPath }, "", nextPath);
    }
  };

  useEffect(() => {
    const redirectPath = new URLSearchParams(window.location.search).get("route");
    if (redirectPath) {
      window.history.replaceState(
        { month: canonicalMonthPath(initialDate) },
        "",
        canonicalMonthPath(initialDate),
      );
    }
    const handlePopState = () => {
      const month = monthFromLocation();
      if (month) setCurrentDate(month);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    // Parse MSS.ics file - it's the source of truth
    const parseICS = async () => {
      try {
        // Get base path using helper function that works in legacy builds
        const basePath = getBaseUrl();
        const icsPath = `${basePath}MSS.ics`;
        console.log("Fetching ICS from:", icsPath, "BASE_URL:", basePath);
        
        // Ensure fetch is available (should be polyfilled, but add safety check)
        if (typeof fetch === 'undefined') {
          throw new Error('fetch API is not available');
        }
        
        const response = await fetch(icsPath);
        if (!response.ok) {
          console.error(
            `Failed to fetch MSS.ics: ${response.status} ${response.statusText}`,
          );
          throw new Error(
            `Failed to fetch MSS.ics: ${response.status} ${response.statusText}`,
          );
        }
        const icsText = await response.text();
        console.log("ICS file loaded, length:", icsText.length, "characters");

        const events: CalendarEvent[] = [];
        const lines = icsText.split(/\r?\n/);

        const formatOccurrenceDate = (year: number, month: number, day: number) =>
          `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const parseOccurrenceDate = (value: string) => {
          const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
          return match
            ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
            : null;
        };

        const expandOccurrenceDates = (
          start: string,
          rrule?: string,
          rdates: string[] = [],
        ): string[] => {
          const dates = new Set<string>([start]);
          for (const rdate of rdates) {
            const parsed = parseOccurrenceDate(rdate);
            if (parsed) dates.add(formatOccurrenceDate(parsed.year, parsed.month, parsed.day));
          }

          if (!rrule) return [...dates].sort();
          const parts = Object.fromEntries(
            rrule.split(";").map((part) => {
              const [key, ...value] = part.split("=");
              return [key, value.join("=")];
            }),
          );
          if (parts.FREQ !== "YEARLY") return [...dates].sort();

          const seed = toLocalDate(start);
          const seedYear = seed.getFullYear();
          const month = Number(parts.BYMONTH || seed.getMonth() + 1);
          const weekdays: Record<string, number> = {
            SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
          };

          for (let year = seedYear; year <= 2100; year += 1) {
            let day: number | null = null;
            const byDay = parts.BYDAY;
            const monthDays = parts.BYMONTHDAY
              ? parts.BYMONTHDAY.split(",").map(Number)
              : [];

            if (byDay && monthDays.length) {
              const weekday = weekdays[byDay.slice(-2)];
              day = monthDays.find(
                (candidate) =>
                  new Date(Date.UTC(year, month - 1, candidate)).getUTCDay() === weekday,
              ) || null;
            } else if (byDay) {
              const match = byDay.match(/^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
              if (match) {
                const ordinal = Number(match[1] || 1);
                const weekday = weekdays[match[2]];
                if (ordinal === -1) {
                  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
                  for (let candidate = lastDay; candidate >= lastDay - 6; candidate -= 1) {
                    if (new Date(Date.UTC(year, month - 1, candidate)).getUTCDay() === weekday) {
                      day = candidate;
                      break;
                    }
                  }
                } else {
                  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
                  day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7;
                }
              }
            } else {
              day = seed.getDate();
            }

            if (day) dates.add(formatOccurrenceDate(year, month, day));
          }
          return [...dates].sort();
        };

        let currentEvent: Partial<
          CalendarEvent & { endDate?: string; rrule?: string; rdates?: string[] }
        > = {};
        let inEvent = false;
        let descriptionLines: string[] = [];
        let inDescription = false;

        let eventCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip completely empty lines, but keep lines with just spaces (they're continuation lines)
          if (line === "") {
            continue;
          }

          const trimmedLine = line.trim();

          if (trimmedLine === "BEGIN:VEVENT") {
            inEvent = true;
            currentEvent = {};
            descriptionLines = [];
            inDescription = false;
            eventCount++;
          } else if (trimmedLine === "END:VEVENT" && inEvent) {
            // Parse description to extract icon and category
            const fullDescription = descriptionLines.join("");

            // If no title was set from SUMMARY, extract it from description (first line before \n\nIcon:)
            if (!currentEvent.title && fullDescription) {
              // Extract title from the portion of the description before metadata markers like \n\nIcon: or \n\nCategory:
              const [rawTitleSection] = fullDescription.split(
                /\\n\\n(?:Icon|Category):/,
              );
              const title = rawTitleSection
                .replace(/\\n/g, " ")
                .replace(/\n/g, " ")
                .replace(/\\,/g, ",")
                .replace(/\\;/g, ";")
                .replace(/\\\\/g, "\\")
                .trim();
              if (title) {
                currentEvent.title = title;
              }
            }

            // Older entries contain several generations of escaped
            // backslashes before "n". Normalize all of them before reading
            // embedded metadata.
            const normalizedDescription = fullDescription
              .replace(/\\+n/g, "\n")
              .replace(/\\+$/gm, "");

            // The description shown in the event card is the unfolded text
            // up to the metadata block (Icon/Category/Image lines), with the
            // ICS escapes removed and the stale per-year "Day:" line dropped.
            const [descriptionBody] = normalizedDescription.split(
              /\n(?=(?:Icon|Category|Image):)/,
            );
            currentEvent.description = descriptionBody
              .replace(/\\,/g, ",")
              .replace(/\\;/g, ";")
              .replace(/\\\\/g, "\\")
              .split("\n")
              .map((part) => part.trim())
              .filter((part) => part && !/^Day:\s/.test(part))
              .join("\n");

            // Image is normally stored in X-IMAGE, but description metadata is
            // retained for compatibility with the older calendar entries.
            let icon = "📅";
            let category = "default";
            let image = currentEvent.image; // Get from X-IMAGE property if set

            const iconMatch = normalizedDescription.match(
              /(?:^|\n)Icon:\s*([^\n]+)/,
            );
            const categoryMatch = normalizedDescription.match(
              /(?:^|\n)Category:\s*([^\n]+)/,
            );
            const imageMatch = normalizedDescription.match(
              /(?:^|\n)Image:\s*([^\n]+)/,
            );

            if (iconMatch) icon = iconMatch[1].trim();
            if (categoryMatch) category = categoryMatch[1].trim();

              // Only use description-based image if X-IMAGE wasn't found
              if (!image && imageMatch) image = imageMatch[1].trim();

              if (currentEvent.title && currentEvent.date) {
                const startDate = toLocalDate(currentEvent.date);
                const endDate = currentEvent.endDate
                  ? toLocalDate(currentEvent.endDate)
                  : addDays(startDate, 1);
                const daysDiff = differenceInCalendarDays(endDate, startDate);

                const eventData: CalendarEvent = {
                  title: currentEvent.title,
                  date: currentEvent.date,
                  endDate: daysDiff > 1 ? currentEvent.endDate : undefined,
                  description: currentEvent.description || "",
                  icon: icon,
                  category: category,
                };

                if (image) {
                  eventData.image = image;
                  console.log(
                    `Event "${currentEvent.title}" has image: ${image.substring(0, 50)}...`,
                  );
                }

                if (currentEvent.calendarMeta) {
                  eventData.calendarMeta = currentEvent.calendarMeta;
                }

                const occurrenceDates = expandOccurrenceDates(
                  currentEvent.date,
                  currentEvent.rrule,
                  currentEvent.rdates,
                );
                for (const occurrenceDate of occurrenceDates) {
                  const occurrenceStart = toLocalDate(occurrenceDate);
                  events.push({
                    ...eventData,
                    date: occurrenceDate,
                    endDate:
                      daysDiff > 1
                        ? format(addDays(occurrenceStart, daysDiff), "yyyy-MM-dd")
                        : undefined,
                  });
                }
              }

            inEvent = false;
            currentEvent = {};
            descriptionLines = [];
            inDescription = false;
          } else if (inEvent && trimmedLine.startsWith("SUMMARY")) {
            // Handle SUMMARY with or without parameters (e.g., SUMMARY: or SUMMARY;LANGUAGE=en:)
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              currentEvent.title = trimmedLine.substring(colonIndex + 1);
            }
          } else if (inEvent && trimmedLine.startsWith("DTSTART")) {
            // Handle DTSTART with or without parameters
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              const dtStart = trimmedLine.substring(colonIndex + 1);
              // Parse ICS date format: YYYYMMDDTHHMMSSZ or YYYYMMDD
              const datePart = dtStart.substring(0, 8); // Get YYYYMMDD part
              const year = datePart.substring(0, 4);
              const month = datePart.substring(4, 6);
              const day = datePart.substring(6, 8);
              currentEvent.date = `${year}-${month}-${day}`;
            }
          } else if (inEvent && trimmedLine.startsWith("DTEND")) {
            // Handle DTEND with or without parameters
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              const dtEnd = trimmedLine.substring(colonIndex + 1);
              // Parse ICS date format: YYYYMMDDTHHMMSSZ or YYYYMMDD
              const datePart = dtEnd.substring(0, 8); // Get YYYYMMDD part
              const year = datePart.substring(0, 4);
              const month = datePart.substring(4, 6);
              const day = datePart.substring(6, 8);
              currentEvent.endDate = `${year}-${month}-${day}`;
            }
          } else if (inEvent && trimmedLine.startsWith("RRULE:")) {
            currentEvent.rrule = trimmedLine.substring("RRULE:".length).trim();
          } else if (inEvent && trimmedLine.startsWith("RDATE")) {
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              const values = trimmedLine
                .substring(colonIndex + 1)
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
              currentEvent.rdates = [...(currentEvent.rdates || []), ...values];
            }
          } else if (inEvent && trimmedLine.startsWith("DESCRIPTION")) {
            // Handle DESCRIPTION with or without parameters
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              const desc = trimmedLine.substring(colonIndex + 1);
              descriptionLines.push(desc);
              inDescription = true;

              // Extract title from first line of description if no SUMMARY field exists
              // The title is the first part before \n\nIcon: or \n\nCategory:
              const [rawTitleSection] = desc.split(/\\n\\n(?:Icon|Category):/);
              if (rawTitleSection && !currentEvent.title) {
                // Use first section as title, clean up escaped characters
                const title = rawTitleSection
                  .replace(/\\n/g, " ")
                  .replace(/\n/g, " ")
                  .replace(/\\,/g, ",")
                  .replace(/\\;/g, ";")
                  .replace(/\\\\/g, "\\")
                  .trim();
                if (title) {
                  currentEvent.title = title;
                }
              }

              // Extract main description (before \n\nIcon:)
              // Handle both literal \n sequences (backslash-n) and actual newlines
              const [rawDescriptionSection] = desc.split(
                /\\n\\n(?:Icon|Category):/,
              );
              const mainDesc = (rawDescriptionSection || desc)
                .replace(/\\n/g, " ")
                .replace(/\n/g, " ")
                .replace(/\\,/g, ",")
                .replace(/\\;/g, ";")
                .replace(/\\\\/g, "\\");
              currentEvent.description = mainDesc;
            }
          } else if (inEvent && trimmedLine.startsWith("X-IMAGE")) {
            // Handle custom X-IMAGE property for image URLs
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              currentEvent.image = trimmedLine.substring(colonIndex + 1).trim();
            }
          } else if (
            inEvent &&
            trimmedLine.startsWith("X-MSS-CALENDAR-META")
          ) {
            const colonIndex = trimmedLine.indexOf(":");
            if (colonIndex >= 0) {
              const metaValue = trimmedLine.substring(colonIndex + 1).trim();
              const parsedMeta = parseCalendarMeta(metaValue);
              if (parsedMeta) {
                currentEvent.calendarMeta = parsedMeta;
              }
            }
          } else if (inDescription && line.startsWith(" ")) {
            // Continuation line for description (ICS format uses leading space)
            // Remove the leading space and add to the last description line
            descriptionLines[descriptionLines.length - 1] += line.substring(1);
          }
        }

        console.log(
          `Found ${eventCount} BEGIN:VEVENT blocks, parsed ${events.length} events`,
        );
        console.log(
          "Calendar data loaded from MSS.ics:",
          events.length,
          "events",
        );

        if (events.length === 0) {
          console.warn(
            "No events found in MSS.ics. ICS file content length:",
            icsText.length,
          );
          console.warn(
            "First 500 characters of ICS:",
            icsText.substring(0, 500),
          );
        }

        // Prefetch all event images for better performance
        // Helper function to resolve image URLs with base path
        const resolveImageUrl = (imagePath: string): string => {
          if (!imagePath) return imagePath;
          // If it's already an absolute URL (http/https), return as-is
          if (
            imagePath.startsWith("http://") ||
            imagePath.startsWith("https://")
          ) {
            return imagePath;
          }
          // If it starts with /, it's an absolute path - prepend base path
          if (imagePath.startsWith("/")) {
            const basePath = getBaseUrl();
            // Remove trailing slash from basePath if present, then add image path
            const cleanBase = basePath.endsWith("/")
              ? basePath.slice(0, -1)
              : basePath;
            return `${cleanBase}${imagePath}`;
          }
          // Relative path - prepend base path
          const basePath = getBaseUrl();
          const cleanBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
          return `${cleanBase}${imagePath}`;
        };

        const imageUrls = new Set<string>();
        events.forEach((event) => {
          if (event.image) {
            const resolvedUrl = resolveImageUrl(event.image);
            imageUrls.add(resolvedUrl);
            // Update the event's image path to the resolved URL for consistent usage
            event.image = resolvedUrl;
          }
        });

        console.log(`Prefetching ${imageUrls.size} unique images...`);
        imageUrls.forEach((imageUrl) => {
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
            // Only log success in development to reduce console noise
            if (isDevMode()) {
              console.log(`✓ Prefetched: ${imageUrl.substring(0, 50)}...`);
            }
          };
          img.onerror = () => {
            // Silently fail for Unsplash URLs (they often fail due to redirects/CORS)
            // Only log failures for local images in development
            if (!imageUrl.includes("unsplash.com") && isDevMode()) {
              console.warn(
                `✗ Failed to prefetch: ${imageUrl.substring(0, 50)}...`,
              );
            }
          };
        });

        setEvents(events);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading MSS.ics:", error);
        // Fallback to CALENDAR_DATA if available
        console.log("Falling back to embedded CALENDAR_DATA");
        setEvents(CALENDAR_DATA);
        setIsLoading(false);
      }
    };

    parseICS();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = toLocalDate(event.date);
      if (Number.isNaN(eventStart.getTime())) {
        return false;
      }

      const eventEndExclusive = event.endDate
        ? toLocalDate(event.endDate)
        : addDays(eventStart, 1);

      if (Number.isNaN(eventEndExclusive.getTime())) {
        return isSameDay(eventStart, date);
      }

      return date >= eventStart && date < eventEndExclusive;
    });
  };

  const getCategoryColor = (category: string) => {
    const borders: { [key: string]: string } = {
      seasonal: "border-green-300",
      environmental: "border-blue-300",
      celebration: "border-purple-300",
      religious: "border-yellow-300",
      cultural: "border-pink-300",
      default: "border-gray-300",
    };
    return borders[category] || borders.default;
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (selectedEvents.length === 0) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEvents([]);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedEvents]);

  const eventDialog =
    selectedEvents.length > 0 ? (
      <div
        className="event-dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
        role="presentation"
        onClick={() => setSelectedEvents([])}
      >
        <div
          className="event-dialog-stack flex w-full max-w-sm max-h-[85vh] flex-col gap-3 overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          {selectedEvents.map((selectedEvent, index) => (
            <section
              key={`${selectedEvent.title}-${selectedEvent.date}`}
              className="event-dialog w-full rounded-2xl bg-white p-5 text-gray-900 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`event-dialog-title-${index}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl leading-none" aria-hidden="true">
                  {selectedEvent.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id={`event-dialog-title-${index}`}
                    className="text-xl font-semibold"
                  >
                    {selectedEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {format(toLocalDate(selectedEvent.date), "MMMM d, yyyy")}
                    {agendaSlugs[selectedEvent.title] && (
                      <>
                        {" · "}
                        <a
                          href={`${agendaUrl}${agendaSlugs[selectedEvent.title]}/`}
                          className="recipe-link"
                          target="_blank"
                          rel="noopener"
                        >
                          Agenda for the day
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {index === 0 && (
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
                    aria-label="Close event details"
                    onClick={() => setSelectedEvents([])}
                  >
                    ×
                  </button>
                )}
              </div>
              {selectedEvent.image && (
                <img
                  src={selectedEvent.image}
                  alt=""
                  className="mt-3 h-24 w-24 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {renderDescription(selectedEvent)}
              </p>
            </section>
          ))}
        </div>
      </div>
    ) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Loading seasonal calendar...</p>
        </div>
      </div>
    );
  }

  // Kiosk mode: full screen calendar only
  if (isKioskMode) {
    return (
      <div className="h-screen w-screen bg-white overflow-hidden">
        <div className="h-full w-full p-2">
          {/* Calendar Grid - no headers, no navigation */}
          <div className="calendar-month-grid grid grid-cols-7 gap-1 h-full">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-500 py-1 christmas-font"
                >
                  {day}
                </div>
              ),
            )}
            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonthDay = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isPast = isCurrentMonthDay && day < today && !isToday;

              const dayEventsWithMeta = dayEvents.map((event) => {
                const eventStart = toLocalDate(event.date);
                const hasValidStart = !Number.isNaN(eventStart.getTime());
                const eventEndExclusive = event.endDate
                  ? toLocalDate(event.endDate)
                  : addDays(eventStart, 1);
                const hasValidEnd =
                  !Number.isNaN(eventEndExclusive.getTime());
                const daysSinceStart = hasValidStart
                  ? differenceInCalendarDays(day, eventStart)
                  : 0;
                const isContinuation =
                  hasValidStart &&
                  daysSinceStart > 0 &&
                  (!event.endDate ||
                    (hasValidEnd && day < eventEndExclusive));
                const isFirstDay = hasValidStart && daysSinceStart === 0;
                return {
                  event,
                  isContinuation,
                  isFirstDay,
                };
              });

              const backgroundImage =
                dayEventsWithMeta.find(
                  ({ event, isFirstDay }) => isFirstDay && event.image,
                )?.event.image || undefined;

              const continuationImageSources = dayEventsWithMeta
                .filter(
                  ({ event, isContinuation }) =>
                    isContinuation && event.image,
                )
                .map(({ event }) => event.image!);
              const continuationImages =
                continuationImageSources.slice(0, 3);
              const displayEvents = isCurrentMonthDay
                ? dayEventsWithMeta.filter(
                    ({ isContinuation }) => !isContinuation,
                  )
                : [];

              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-day-cell h-full p-1 border border-gray-200 rounded relative flex flex-col overflow-hidden ${
                    isToday ? "ring-2 ring-green-500" : ""
                  }`}
                  style={{
                    ...(backgroundImage
                      ? {
                          backgroundImage: `url(${backgroundImage})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          backgroundColor: isCurrentMonthDay
                            ? "#ffffff"
                            : "#f9fafb",
                        }
                      : {
                          backgroundColor: isCurrentMonthDay
                            ? "#ffffff"
                            : "#f9fafb",
                        }),
                  }}
                >
                  {backgroundImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>
                  )}
                  {isPast && (
                    <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                      <span
                        className="text-red-500"
                        style={{
                          fontSize: "3rem",
                          fontWeight: 700,
                          opacity: 0.35,
                          fontFamily:
                            '"Permanent Marker", "Comic Sans MS", "Marker Felt", cursive',
                          transform: "rotate(-8deg)",
                          textShadow:
                            "1px 1px 0 rgba(220,38,38,0.35), -1px -1px 0 rgba(220,38,38,0.35)",
                        }}
                      >
                        X
                      </span>
                    </div>
                  )}

                  {continuationImages.length > 0 && (
                    <div className="calendar-continuation-images absolute top-1 right-1 flex flex-col gap-0.5 items-end z-10 pointer-events-none">
                      {continuationImages.map((image, index) => (
                        <img
                          key={`${image}-${index}`}
                          src={image}
                          alt=""
                          aria-hidden="true"
                          className="w-6 h-6 object-cover rounded shadow ring-1 ring-white"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ))}
                      {continuationImageSources.length >
                        continuationImages.length && (
                        <div className="w-6 h-6 rounded bg-black bg-opacity-50 text-white text-[8px] flex items-center justify-center shadow ring-1 ring-white">
                          +
                          {continuationImageSources.length -
                            continuationImages.length}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-xs font-medium mb-0.5 christmas-font relative z-10 ${
                      isCurrentMonthDay
                        ? backgroundImage
                          ? "text-white drop-shadow-lg"
                          : "text-gray-800"
                        : "text-gray-400"
                    } ${isToday ? "text-green-600 font-bold" : ""}`}
                  >
                    {isCurrentMonthDay ? format(day, "d") : "\u00A0"}
                  </div>

                  <div className="flex-1"></div>

                  <div className="calendar-event-list space-y-0.5 relative z-10 overflow-y-auto">
                    {displayEvents.slice(0, 5).map(({ event }, index) => {
                      const showInlineImage =
                        !backgroundImage && !!event.image;
                      const baseLabelClasses =
                        "text-[10px] p-0.5 rounded cursor-pointer transition-all group relative font-bold";
                      const labelClasses = backgroundImage
                        ? `${baseLabelClasses} bg-black bg-opacity-50 text-white`
                        : `${baseLabelClasses} bg-white text-black border ${getCategoryColor(event.category)}`;
                      return (
                        <button
                          type="button"
                          key={index}
                          className={`calendar-event-label ${labelClasses}`}
                          onClick={() =>
                            openEventCards(
                              event,
                              displayEvents.map((entry) => entry.event),
                            )
                          }
                          onMouseEnter={(e) => {
                            const metadataHtml = (() => {
                              const meta = event.calendarMeta;
                              if (!meta) {
                                return "";
                              }
                              const altCalendars =
                                meta.alternateCalendars &&
                                meta.alternateCalendars.length > 0
                                  ? meta.alternateCalendars
                                      .map((alt) => {
                                        const descriptor = [
                                          alt.descriptor,
                                          alt.notes,
                                        ]
                                          .filter(Boolean)
                                          .join(" — ");
                                        return `${alt.calendarSystem}: ${
                                          descriptor || alt.descriptor
                                        }`;
                                      })
                                      .join("<br/>")
                                  : "";
                              const recurrence =
                                meta.recurrence && meta.recurrence.rule
                                  ? `Recurrence: ${meta.recurrence.rule}`
                                  : "";
                              return [altCalendars, recurrence]
                                .filter(Boolean)
                                .join("<br/><br/>");
                            })();
                            if (metadataHtml) {
                              showEventTooltip(e.currentTarget, event, metadataHtml);
                            }
                          }}
                          onMouseLeave={hideEventTooltip}
                        >
                          <span
                            className="mobile-event-icon"
                            role="img"
                            aria-label={event.title}
                            title={event.title}
                          >
                            {event.icon}
                          </span>
                          <div className="desktop-event-content flex items-center gap-1">
                              {showInlineImage && event.image ? (
                                <img
                                  src={event.image}
                                  alt=""
                                  className="w-3 h-3 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-[10px]">
                                  {event.icon}
                                </span>
                              )}
                              <span className="truncate christmas-font text-[10px]">
                                {event.title}
                              </span>
                          </div>
                        </button>
                      );
                    })}
                    {displayEvents.length > 5 && (
                      <div className="calendar-more-count text-[8px] text-gray-500 text-center">
                        +{displayEvents.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {eventDialog}
        </div>
      </div>
    );
  }

  // Normal mode: full UI with headers and navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 christmas-title">
              Maybe Something Seasonal
            </h1>
            <p className="text-lg text-gray-600 mb-1">
              A calendar celebrating nature's cycles and seasonal moments
            </p>
            <p className="mb-4 text-sm">
              <a href={agendaUrl} className="recipe-link">
                A day for each feast
              </a>
              {" · "}
              <a href={recipesUrl} className="recipe-link">
                Feast-day recipes
              </a>
            </p>
          </div>

          {/* Action buttons in top right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            <a
              href={`${getBaseUrl()}MSS.ics`}
              download="MSS.ics"
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Download Calendar (editable .ics file - import to edit)"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={handlePrint}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Print Calendar"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "calendar"
                    ? "text-green-700 border-b-2 border-green-600 bg-green-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                type="button"
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "events"
                    ? "text-green-700 border-b-2 border-green-600 bg-green-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                type="button"
              >
                MSS Events Index
              </button>
            </div>
            <div className="p-6">
              {activeTab === "calendar" ? (
                <>
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => showMonth(subMonths(currentDate, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-800 christmas-title">
                      {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <button
                      onClick={() => showMonth(addMonths(currentDate, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-500 py-1 christmas-font"
                        >
                          {day}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="calendar-month-grid grid grid-cols-7 gap-2">
                      {calendarDays.map((day) => {
                        const dayEvents = getEventsForDate(day);
                        const isCurrentMonthDay = isSameMonth(day, currentDate);
                        const isToday = isSameDay(day, new Date());
                        const isPast = isCurrentMonthDay && day < today && !isToday;

                        const dayEventsWithMeta = dayEvents.map((event) => {
                          const eventStart = toLocalDate(event.date);
                          const hasValidStart = !Number.isNaN(eventStart.getTime());
                          const eventEndExclusive = event.endDate
                            ? toLocalDate(event.endDate)
                            : addDays(eventStart, 1);
                          const hasValidEnd =
                            !Number.isNaN(eventEndExclusive.getTime());
                          const daysSinceStart = hasValidStart
                            ? differenceInCalendarDays(day, eventStart)
                            : 0;
                          const isContinuation =
                            hasValidStart &&
                            daysSinceStart > 0 &&
                            (!event.endDate ||
                              (hasValidEnd && day < eventEndExclusive));
                          const isFirstDay = hasValidStart && daysSinceStart === 0;
                          return {
                            event,
                            isContinuation,
                            isFirstDay,
                          };
                        });

                        // Only use the full card background on the first day of the event
                        const backgroundImage =
                          dayEventsWithMeta.find(
                            ({ event, isFirstDay }) => isFirstDay && event.image,
                          )?.event.image || undefined;

                        const continuationImageSources = dayEventsWithMeta
                          .filter(
                            ({ event, isContinuation }) =>
                              isContinuation && event.image,
                          )
                          .map(({ event }) => event.image!);
                        const continuationImages =
                          continuationImageSources.slice(0, 3);
                        const displayEvents = isCurrentMonthDay
                          ? dayEventsWithMeta.filter(
                              ({ isContinuation }) => !isContinuation,
                            )
                          : [];

                        return (
                          <div
                            key={day.toISOString()}
                            className={`calendar-day-cell min-h-[120px] p-2 border rounded-lg relative flex flex-col overflow-hidden ${
                              isToday ? "ring-2 ring-green-500" : ""
                            }`}
                            style={{
                              ...(backgroundImage
                                ? {
                                    backgroundImage: `url(${backgroundImage})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundRepeat: "no-repeat",
                                    backgroundColor: isCurrentMonthDay
                                      ? "#ffffff"
                                      : "#f9fafb",
                                  }
                                : {
                                    backgroundColor: isCurrentMonthDay
                                      ? "#ffffff"
                                      : "#f9fafb",
                                  }),
                            }}
                          >
                          {/* Overlay for text readability - only show if image loads */}
                          {backgroundImage && (
                            <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>
                          )}
                          {isPast && (
                            <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                              <span
                                className="text-red-500"
                                style={{
                                  fontSize: "4rem",
                                  fontWeight: 700,
                                  opacity: 0.35,
                                  fontFamily:
                                    '"Permanent Marker", "Comic Sans MS", "Marker Felt", cursive',
                                  transform: "rotate(-8deg)",
                                  textShadow:
                                    "1px 1px 0 rgba(220,38,38,0.35), -1px -1px 0 rgba(220,38,38,0.35)",
                                }}
                              >
                                X
                              </span>
                            </div>
                          )}

                          {/* Continuation images for multi-day events */}
                          {continuationImages.length > 0 && (
                            <div className="calendar-continuation-images absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
                              {continuationImages.map((image, index) => (
                                <img
                                  key={`${image}-${index}`}
                                  src={image}
                                  alt=""
                                  aria-hidden="true"
                                  className="w-10 h-10 object-cover rounded shadow ring-2 ring-white"
                                />
                              ))}
                              {continuationImageSources.length >
                                continuationImages.length && (
                                <div className="w-10 h-10 rounded bg-black bg-opacity-50 text-white text-[10px] flex items-center justify-center shadow ring-2 ring-white">
                                  +
                                  {continuationImageSources.length -
                                    continuationImages.length}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Day number at top */}
                          <div
                            className={`text-xs font-medium mb-1 christmas-font relative z-10 ${
                              isCurrentMonthDay
                                ? backgroundImage
                                  ? "text-white drop-shadow-lg"
                                  : "text-gray-800"
                                : "text-gray-400"
                            } ${isToday ? "text-green-600 font-bold" : ""}`}
                          >
                            {isCurrentMonthDay ? format(day, "d") : "\u00A0"}
                          </div>

                          {/* Spacer to push events to bottom */}
                          <div className="flex-1"></div>

                          {/* Event labels at bottom */}
                          <div className="calendar-event-list space-y-1 relative z-10">
                            {displayEvents.slice(0, 3).map(({ event }, index) => {
                              const showInlineImage =
                                !backgroundImage && !!event.image;
                              const baseLabelClasses =
                                "text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all group relative font-bold";
                              const labelClasses = backgroundImage
                                ? `${baseLabelClasses} bg-black bg-opacity-50 text-white`
                                : `${baseLabelClasses} bg-white text-black border ${getCategoryColor(event.category)}`;
                              return (
                                <button
                                  type="button"
                                  key={index}
                                  className={`calendar-event-label ${labelClasses}`}
                                  onClick={() =>
                                    openEventCards(
                                      event,
                                      displayEvents.map((entry) => entry.event),
                                    )
                                  }
                                  onMouseEnter={(e) => {
                                    const metadataHtml = (() => {
                                      const meta = event.calendarMeta;
                                      if (!meta) {
                                        return "";
                                      }
                                      const altCalendars =
                                        meta.alternateCalendars &&
                                        meta.alternateCalendars.length > 0
                                          ? meta.alternateCalendars
                                              .map((alt) => {
                                                const descriptor = [
                                                  alt.descriptor,
                                                  alt.notes,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" — ");
                                                return `${alt.calendarSystem}: ${
                                                  descriptor || alt.descriptor
                                                }`;
                                              })
                                              .join("<br />")
                                          : "";
                                      const recurrence = meta.recurrence
                                        ? `Recurs (${
                                            meta.recurrence.calendarSystem ||
                                            "calendar"
                                          }): ${meta.recurrence.rule}${
                                            meta.recurrence.anchor
                                              ? ` — ${meta.recurrence.anchor}`
                                              : ""
                                          }`
                                        : "";
                                      const rows = [altCalendars, recurrence].filter(
                                        (section) => section && section.length > 0,
                                      );
                                      if (!rows.length) {
                                        return "";
                                      }
                                      return `<div class="mt-2 border-t border-gray-700 pt-2 text-[10px] leading-relaxed text-gray-200">${rows
                                        .map((row) => `<div>${row}</div>`)
                                        .join("")}</div>`;
                                    })();
                                    const tooltip = document.createElement("div");
                                    tooltip.className =
                                      "absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs pointer-events-none";
                                    tooltip.innerHTML = `
                                <div class="font-semibold mb-1">${event.title}</div>
                                <div class="text-gray-300 mb-2">${format(toLocalDate(event.date), "MMMM d, yyyy")}</div>
                                <div class="text-gray-200">${event.description}</div>
                                ${event.image ? `<img src="${event.image}" class="mt-2 w-16 h-16 object-cover rounded" />` : ""}
                                ${metadataHtml}
                              `;
                                    tooltip.style.left = "0";
                                    tooltip.style.bottom = "100%";
                                    tooltip.style.marginBottom = "4px";
                                    e.currentTarget.appendChild(tooltip);
                                  }}
                                  onMouseLeave={(e) => {
                                    const tooltip = e.currentTarget.querySelector(
                                      'div[class*="absolute z-50"]',
                                    );
                                    if (tooltip) {
                                      tooltip.remove();
                                    }
                                  }}
                                >
                                  <span
                                    className="mobile-event-icon"
                                    role="img"
                                    aria-label={event.title}
                                    title={event.title}
                                  >
                                    {event.icon}
                                  </span>
                                  <span className="desktop-event-content">
                                  {!backgroundImage && (
                                    <>
                                      {showInlineImage ? (
                                        <img
                                          src={event.image}
                                          alt={event.title}
                                          className="w-4 h-4 object-cover rounded mr-1 inline-block"
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                            const nextSibling =
                                              e.currentTarget.nextElementSibling;
                                            if (
                                              nextSibling &&
                                              nextSibling instanceof HTMLElement
                                            ) {
                                              nextSibling.style.display = "inline";
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span className="mr-1">{event.icon}</span>
                                      )}
                                    </>
                                  )}
                                  <span
                                    className={`truncate christmas-font text-xs ${
                                      backgroundImage ? "text-white" : "text-black"
                                    }`}
                                  >
                                    {event.title}
                                  </span>
                                  </span>
                                </button>
                              );
                            })}
                            {displayEvents.length > 3 && (
                              <div
                                className={`calendar-more-count text-xs font-bold p-1 rounded ${
                                  backgroundImage
                                    ? "bg-black bg-opacity-50 text-white"
                                    : "bg-white text-black border border-gray-300"
                                }`}
                              >
                                +{displayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                          </div>
                        );
                      })}
                    </div>
                </>
              ) : (
                <div className="min-h-[60vh]">
                  <iframe
                    title="Maybe Something Seasonal Events Index"
                    src={mssEventsUrl}
                    className="w-full h-[70vh] rounded-lg border border-gray-200 shadow-inner"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
      </div>
      {eventDialog}
    </div>
  );
};

export default App;
