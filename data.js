// MBG GLC data configuration
// After publishing the Google Sheet Results tab as CSV, paste the CSV URL below.
// Expected columns: Date, Player, Badge / Type, Deck Name, Decklist URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkIKtrbJbYz0JkQLnozeXyccnjmEarKQpnWmx9nxkwCSo4HjNj1qsJ8oUMfxsbiDHFJx1QlWTDWoEY/pub?gid=1892256709&single=true&output=csv";

const TYPES=["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Dragon","Colorless","Fairy"];

// Shown only until SHEET_CSV_URL is configured.
const DEMO_RESULTS=[
 {date:"2026-11-28",player:"Alex Trainer",type:"Dragon",deck:"Dragon Box",deckUrl:"#"},
 {date:"2026-11-14",player:"Jordan Trainer",type:"Fire",deck:"Fire Toolbox",deckUrl:"#"}
];
