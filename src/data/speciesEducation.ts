export type SpeciesEducation = {
  scientificName: string;
  appearance: string;
  habitat: string;
  diet: string;
  commonSize: string;
  conservationStatus: string;
  fieldNote: string;
  imageKey: string;
  imagePath: string;
  imageCredit: string;
  sourceLabel: string;
  sourceUrl: string;
  imagePageUrl: string;
};

/**
 * ข้อมูลหน้านี้ตั้งใจแยกจากค่าสมดุลเกม เพื่อให้เพิ่มสัตว์น้ำจริงในอนาคต
 * ได้โดยไม่ไปกระทบโอกาสตก น้ำหนัก หรือราคาขายในเกม
 */
export const SPECIES_EDUCATION: Record<string, SpeciesEducation> = {
  "ปลากระบอก": {
    scientificName: "Mugil cephalus",
    appearance: "ลำตัวทรงกระบอกค่อนข้างอวบ หัวกว้างแบน และมีเยื่อไขมันคลุมตา",
    habitat: "ทะเลชายฝั่ง ปากแม่น้ำ และแหล่งน้ำกร่อย",
    diet: "เศษอินทรียวัตถุ สาหร่ายขนาดเล็ก และสัตว์หน้าดิน",
    commonSize: "พบบ่อยประมาณ 50 ซม.",
    conservationStatus: "น่ากังวลน้อย (LC)",
    fieldNote: "มักว่ายรวมฝูงเหนือพื้นทรายหรือโคลน",
    imageKey: "species-real-mugil-cephalus",
    imagePath: "assets/species/mugil-cephalus-real.jpg",
    imageCredit: "Alberto Alcalá · CC BY 4.0",
    sourceLabel: "ข้อมูล: FishBase",
    sourceUrl: "https://www.fishbase.org/summary/785",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Mugil_cephalus_Socorro_island_(cropped).jpg"
  },
  "ปลากะพงขาว": {
    scientificName: "Lates calcarifer",
    appearance: "ลำตัวยาว ปากใหญ่เฉียง ขากรรไกรบนเลยตา และครีบหางมน",
    habitat: "ชายฝั่ง ปากแม่น้ำ ลากูน และแม่น้ำเขตร้อน",
    diet: "ปลาและสัตว์เปลือกแข็ง เช่น กุ้งและปู",
    commonSize: "พบบ่อยราว 150 ซม.",
    conservationStatus: "น่ากังวลน้อย (LC)",
    fieldNote: "วัยอ่อนจำนวนมากเป็นเพศผู้ ก่อนบางตัวเปลี่ยนเป็นเพศเมีย",
    imageKey: "species-real-lates-calcarifer",
    imagePath: "assets/species/lates-calcarifer-real.jpg",
    imageCredit: "Bjoertvedt · CC BY-SA 3.0",
    sourceLabel: "ข้อมูล: FishBase",
    sourceUrl: "https://www.fishbase.org/summary/Lates-calcarifer",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Lates_calcarifer_01.JPG"
  },
  "ปลาทู": {
    scientificName: "Rastrelliger brachysoma",
    appearance: "ลำตัวค่อนข้างลึก จมูกแหลม ครีบสีเหลืองอ่อน และขอบครีบหลังสีดำ",
    habitat: "ทะเลใกล้ฝั่งและน้ำกร่อย ลึกราว 15–200 ม.",
    diet: "แพลงก์ตอนสัตว์ขนาดเล็ก และแพลงก์ตอนพืช",
    commonSize: "พบบ่อยประมาณ 20 ซม.",
    conservationStatus: "มีแนวโน้มใกล้สูญพันธุ์ (VU)",
    fieldNote: "มักรวมฝูงกับปลาที่มีขนาดใกล้เคียงกัน",
    imageKey: "species-real-rastrelliger-brachysoma",
    imagePath: "assets/species/rastrelliger-brachysoma-real.jpg",
    imageCredit: "Wibowo Djatmiko · CC BY-SA 3.0",
    sourceLabel: "ข้อมูล: FishBase",
    sourceUrl: "https://www.fishbase.org/summary/109",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Rastrel_brachy_121008-0324_tdp.jpg"
  },
  "กุ้งก้ามกราม": {
    scientificName: "Macrobrachium rosenbergii",
    appearance: "ลำตัวยาวสีเขียวเทาถึงน้ำเงิน ก้ามคู่ที่สองของตัวผู้โตเต็มวัยยาวและเด่นชัด",
    habitat: "แหล่งน้ำจืดเขตร้อนที่เชื่อมต่อกับน้ำกร่อย โดยตัวอ่อนต้องเจริญในน้ำกร่อย",
    diet: "กินทั้งสาหร่าย พืชน้ำ หอย แมลงน้ำ หนอน และสัตว์เปลือกแข็งขนาดเล็ก",
    commonSize: "ตัวผู้ยาวได้ถึงประมาณ 32 ซม.",
    conservationStatus: "ยังไม่แสดงสถานะการอนุรักษ์ในฐานข้อมูลเกม",
    fieldNote: "หลังพ้นระยะตัวอ่อนสามารถเดินตามพื้นท้องน้ำและบริเวณชื้นริมตลิ่งได้",
    imageKey: "species-real-macrobrachium-rosenbergii",
    imagePath: "assets/species/macrobrachium-rosenbergii-real.jpg",
    imageCredit: "Citron · CC BY-SA 3.0",
    sourceLabel: "ข้อมูล: FAO",
    sourceUrl: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_giantriverprawn.htm",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Macrobrachium_rosenbergii.jpg"
  },
  "ปูม้า": {
    scientificName: "Portunus pelagicus",
    appearance: "กระดองกว้าง มีหนามด้านข้าง ขาคู่สุดท้ายแบนเป็นพายสำหรับว่ายน้ำ",
    habitat: "ทะเลตื้นบริเวณพื้นทรายถึงทรายปนโคลนตามชายฝั่ง",
    diet: "กินหอย สัตว์เปลือกแข็งขนาดเล็ก ปลา และซากอินทรียวัตถุ",
    commonSize: "ความกว้างกระดองพบได้ราว 10–20 ซม.",
    conservationStatus: "ยังไม่แสดงสถานะการอนุรักษ์ในฐานข้อมูลเกม",
    fieldNote: "ตัวผู้มักมีสีฟ้าสดกว่าตัวเมีย",
    imageKey: "species-real-portunus-pelagicus",
    imagePath: "assets/species/portunus-pelagicus-real.jpg",
    imageCredit: "Almandine · CC BY-SA 3.0",
    sourceLabel: "ข้อมูล: FAO Species Guide",
    sourceUrl: "https://isopods.nhm.org/pdfs/4113/4113.pdf",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Portunus_pelagicus_male.jpg"
  },
  "หอยแครง": {
    scientificName: "Tegillarca granosa",
    appearance: "เปลือกหนาทรงค่อนข้างกลม มีสันรัศมีนูนชัดเรียงจากยอดสู่ขอบเปลือก",
    habitat: "พื้นโคลนหรือทรายปนโคลนในเขตน้ำตื้นและปากแม่น้ำ",
    diet: "กรองแพลงก์ตอนและอนุภาคอินทรียวัตถุขนาดเล็กจากน้ำ",
    commonSize: "เปลือกโตเต็มวัยราว 5–6 ซม.",
    conservationStatus: "ยังไม่แสดงสถานะการอนุรักษ์ในฐานข้อมูลเกม",
    fieldNote: "เนื้อมีสีแดงจากสารฮีโมโกลบิน จึงมีชื่ออังกฤษว่า blood cockle",
    imageKey: "species-real-tegillarca-granosa",
    imagePath: "assets/species/tegillarca-granosa-real.jpg",
    imageCredit: "H. Zell · CC BY-SA 3.0",
    sourceLabel: "ข้อมูลอนุกรมวิธาน: Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/Tegillarca_granosa",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Tegillarca_granosa_01.jpg"
  },
  "หอยกาบเอเชีย": {
    scientificName: "Corbicula fluminea",
    appearance: "เปลือกสองฝาทรงสามเหลี่ยมมน มีสันนูนเป็นวงตามการเติบโตและสีเหลืองน้ำตาล",
    habitat: "แม่น้ำและทะเลสาบน้ำจืด โดยมักฝังตัวในทรายหรือกรวดละเอียดเขตน้ำตื้น",
    diet: "กรองแพลงก์ตอนและอนุภาคอินทรียวัตถุจากน้ำ",
    commonSize: "ความยาวเปลือกโดยทั่วไปไม่เกินประมาณ 5 ซม.",
    conservationStatus: "เป็นชนิดต่างถิ่นรุกรานในหลายพื้นที่นอกถิ่นกำเนิด",
    fieldNote: "ทนสภาพแวดล้อมได้หลากหลายและเพิ่มจำนวนได้รวดเร็ว",
    imageKey: "species-real-corbicula-fluminea",
    imagePath: "assets/species/corbicula-fluminea-real.jpg",
    imageCredit: "USGS · Public domain",
    sourceLabel: "ข้อมูล: USGS NAS",
    sourceUrl: "https://nas.er.usgs.gov/queries/greatLakes/FactSheet.aspx?Species_ID=92",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Corbicula_fluminea.jpg"
  },
  "ปลากระโทงดาบ": {
    scientificName: "Xiphias gladius",
    appearance: "ลำตัวยาว ปากบนแบนยื่นคล้ายดาบ และไม่มีครีบท้อง",
    habitat: "ทะเลเปิดเขตร้อนถึงเขตอบอุ่น โดยมากลึกไม่เกิน 550 ม.",
    diet: "ปลา หมึก และสัตว์เปลือกแข็ง",
    commonSize: "พบบ่อยราว 300 ซม.",
    conservationStatus: "ใกล้ถูกคุกคาม (NT)",
    fieldNote: "ใช้ส่วนปากคล้ายดาบทำให้เหยื่อบาดเจ็บก่อนกิน",
    imageKey: "species-real-xiphias-gladius",
    imagePath: "assets/species/xiphias-gladius-real.jpg",
    imageCredit: "Sylvain Eichhorn · CC BY 4.0",
    sourceLabel: "ข้อมูล: FishBase",
    sourceUrl: "https://www.fishbase.org/summary/226",
    imagePageUrl: "https://commons.wikimedia.org/wiki/File:Xiphias_gladius_in_the_sea.jpg"
  }
};
