/** Reproducible original illustrations. No network, AI calls, or external assets. */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BOOK_TEMPLATES } from "../src/lib/templateCatalog";

function art(id: string, scene: number) {
  const shift = scene * 37;
  const defs = `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#17344f"/><stop offset=".58" stop-color="#9eb7bc"/><stop offset="1" stop-color="#f7c99b"/></linearGradient><linearGradient id="warm" x2="1" y2="1"><stop stop-color="#f9eacb"/><stop offset="1" stop-color="#c78459"/></linearGradient><radialGradient id="light"><stop stop-color="#ffebba"/><stop offset="1" stop-color="#d8b88e"/></radialGradient><filter id="grain"><feTurbulence baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs>`;
  let body = "";
  if (id === "photo-book") {
    body = `<rect width="1200" height="900" fill="url(#sky)"/><circle cx="${810-shift}" cy="${330+shift/3}" r="74" fill="#ffe8b0" opacity=".9"/><path d="M0 550 220 365 470 530 730 325 1200 540V900H0Z" fill="#607d88"/><path d="M0 625 270 490 590 605 1020 440 1200 525V900H0Z" fill="#344f61"/><path d="M0 650Q450 610 1200 660V900H0Z" fill="#608b98"/>${Array.from({length:45},(_,i)=>`<path d="M${(i*137)%1100} ${675+i*5}h${30+(i*53)%270}" stroke="${i%3 ? '#a7c2bd':'#f7dba8'}" opacity=".3" stroke-width="2"/>`).join("")}`;
  } else if (id === "picture-book") {
    body = `<rect width="1200" height="900" fill="#193c52"/><circle cx="${880-shift}" cy="190" r="75" fill="#fff0b9"/>${Array.from({length:24},(_,i)=>`<circle cx="${(i*127)%1200}" cy="${40+(i*63)%470}" r="${i%3+1}" fill="#f5e5b9"/>`).join("")}<path d="M0 650Q300 380 650 620T1200 540V900H0" fill="#315f66"/><path d="M0 760Q380 540 700 720T1200 680V900H0" fill="#57816d"/>${[100,250,1040,1140].map((x,i)=>`<path d="M${x} 780V${220+i*40}" stroke="#243e44" stroke-width="26"/><ellipse cx="${x}" cy="${280+i*40}" rx="100" ry="160" fill="#284f54"/>`).join("")}<g transform="translate(${430+shift/2},560)"><path d="M120 150Q340 220 330 50Q300 140 210 110" fill="#d8793e"/><path d="M300 122Q345 105 330 50L290 99" fill="#f5ddb2"/><ellipse cx="110" cy="140" rx="85" ry="65" fill="#de8747"/><path d="M35 55 35-30 95 20 155-30 173 70 110 126Z" fill="#e99950"/><path d="M35 55 110 126 62 87M173 70 110 126 150 85" fill="#f7e7c5"/><circle cx="74" cy="58" r="5" fill="#243642"/><circle cx="136" cy="58" r="5" fill="#243642"/><circle cx="109" cy="96" r="7" fill="#243642"/></g>`;
  } else if (id === "recipe") {
    body = `<rect width="1200" height="900" fill="#e6d4b8"/>${Array.from({length:18},(_,i)=>`<path d="M0 ${i*54}H1200" stroke="#ad8660" opacity=".12" stroke-width="3"/>`).join("")}<path d="M40 80 400 30 485 830 140 900Z" fill="#f7efdc"/><ellipse cx="680" cy="500" rx="320" ry="270" fill="#79573f" opacity=".13"/><ellipse cx="650" cy="465" rx="320" ry="270" fill="#faf4e6"/><ellipse cx="650" cy="465" rx="275" ry="225" fill="#a56731"/><ellipse cx="650" cy="454" rx="262" ry="214" fill="#e0b168"/>${Array.from({length:30},(_,i)=>`<rect x="${425+(i*79)%410}" y="${300+(i*59)%285}" width="${28+i%4*5}" height="32" rx="8" fill="${['#e78b42','#f3d69b','#e6bd77'][i%3]}" transform="rotate(${i*23} ${450+(i*79)%410} ${320+(i*59)%285})"/>`).join("")}${Array.from({length:14},(_,i)=>`<ellipse cx="${445+(i*89)%405}" cy="${320+(i*67)%270}" rx="13" ry="6" fill="#59734b" transform="rotate(${i*37} ${445+(i*89)%405} ${320+(i*67)%270})"/>`).join("")}<path d="M1050 180 1000 730" stroke="#ae9470" stroke-width="21"/><ellipse cx="1057" cy="147" rx="44" ry="70" fill="#bea782"/><g fill="#648056"><ellipse cx="200" cy="660" rx="45" ry="18" transform="rotate(-35 200 660)"/><ellipse cx="240" cy="700" rx="45" ry="18" transform="rotate(25 240 700)"/></g>`;
  } else if (id === "magazine") {
    body = `<rect width="1200" height="900" fill="#df674b"/><rect x="0" y="0" width="600" height="900" fill="#d0d7cf"/><path d="M260 900V360A270 270 0 0 1 800 360V900" fill="#f1e6d3"/><path d="M390 900V390A145 145 0 0 1 680 390V900" fill="#254b59"/><path d="M460 900V430A75 75 0 0 1 610 430V900" fill="#e3ae75"/><path d="M0 740 1200 430V640L0 950" fill="#172e40" opacity=".2"/><circle cx="1030" cy="180" r="100" fill="#e4ba75"/><path d="M830 880V330M850 880V330M870 880V330" stroke="#8f473c" stroke-width="8"/>`;
  } else if (id === "photographer") {
    body = `<rect width="1200" height="900" fill="#ece8dd"/><path d="M0 740 740 0H1200V900H0" fill="#d9d0bf"/><circle cx="${450+shift}" cy="395" r="210" fill="#d16c48"/><rect x="610" y="280" width="200" height="420" rx="100" fill="#294851"/><path d="M180 640 730 880 1030 685 500 550Z" fill="#a5a393" opacity=".45"/><circle cx="360" cy="500" r="130" fill="#efd4a1"/><path d="M910 180v540" stroke="#575d55" stroke-width="3"/><path d="M110 155H1090" stroke="#575d55" opacity=".35"/>`;
  } else if (id === "research") {
    body = `<rect width="1200" height="900" fill="#e8f0ec"/>${Array.from({length:25},(_,i)=>`<path d="M${i*50} 0V900M0 ${i*50}H1200" stroke="#98b5ae" opacity=".23"/>`).join("")}<path d="M110 750 380 520 630 585 1080 170" fill="none" stroke="#24706a" stroke-width="12"/>${[[110,750],[380,520],[630,585],[1080,170]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="22" fill="#e0b45e" stroke="#24706a" stroke-width="8"/>`).join("")}<g transform="translate(320,200)"><path d="M0 100H500M0 155H500M30 240H470" stroke="#927d5d" stroke-width="35"/><path d="M70 100V345M425 100V345" stroke="#315454" stroke-width="18"/></g>`;
  } else if (id === "teacher") {
    body = `<rect width="1200" height="900" fill="#e7ecdb"/><rect x="190" y="110" width="700" height="720" rx="18" fill="#fff8e6" transform="rotate(-7 540 470)"/>${Array.from({length:12},(_,i)=>`<path d="M290 ${240+i*40}H790" stroke="#b9c7ac" stroke-width="2"/>`).join("")}<g transform="translate(520,210) rotate(14)"><path d="M0 430Q-180 180 0 0Q190 200 0 430" fill="#7d9b61"/><path d="M0 50V470M0 150-90 100M0 230 120 145M0 310-85 230" stroke="#d6e1ad" stroke-width="7" fill="none"/></g><path d="M920 150 1060 770" stroke="#d6a354" stroke-width="24"/><path d="M1060 770 1070 810 1045 786" fill="#44574b"/>`;
  } else {
    body = `<rect width="1200" height="900" fill="${id==='writer'?'#9caeac':'#e9d5bc'}"/><rect x="110" y="70" width="560" height="530" fill="#c6d3ce"/><path d="M385 70V600M110 340H670" stroke="#f4eddb" stroke-width="24"/><path d="M0 750 1200 560V900H0" fill="#a78261"/><path d="M430 670Q610 600 780 680V850Q600 790 430 850Z" fill="#fff2d8"/><path d="M780 680Q950 610 1090 665V840Q930 800 780 850Z" fill="#eddfc4"/><path d="M780 680V850" stroke="#b7a68a" stroke-width="3"/><ellipse cx="270" cy="714" rx="95" ry="27" fill="#775d47" opacity=".25"/><path d="M185 590H340V700Q265 760 190 700Z" fill="#eee6d6"/><ellipse cx="265" cy="590" rx="77" ry="23" fill="#a67b56"/><path d="M340 605Q420 590 387 662Q366 690 341 662" stroke="#eee6d6" stroke-width="18" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${defs}<g filter="url(#grain)">${body}</g></svg>`;
}

async function main() {
for (const template of BOOK_TEMPLATES) {
  const directory = path.join(process.cwd(), "public/sample-books", template.id);
  await fs.mkdir(directory, { recursive: true });
  await sharp(Buffer.from(art(template.id, 0))).resize(900, 1200, { fit: "cover" }).webp({ quality: 86 }).toFile(path.join(directory, "cover.webp"));
  for (const [index, section] of template.sections.entries()) {
    if (section.image) await sharp(Buffer.from(art(template.id, index + 1))).webp({ quality: 86 }).toFile(path.join(directory, `section-${index + 1}.webp`));
  }
}
console.log("Gate38 original artwork generated: 9 covers and section illustrations.");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
