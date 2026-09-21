
import React, { useState, useCallback, useEffect } from 'react';
import FeatureCard from './FeatureCard';
import ImageUploader from './ImageUploader';
import { generateInPlaceVideo } from '../services/geminiService';
import type { ImageFile, HistoryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface InPlaceVideoMakerProps {
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'tabId' | 'tabLabel'>) => void;
}

type GenerationMode = 'strict' | 'style' | 'caricature';
type ProportionMode = 'realistic' | 'heroic' | 'chibi';
type RenderStyle = 'keep_original' | 'pixel_retro' | 'modern_2d' | 'ps1_retro' | 'ps4_modern' | 'retro_pixar' | 'hand_drawn';

const InPlaceVideoMaker: React.FC<InPlaceVideoMakerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  
  // Data Structure - THE ULTIMATE MERGED ROSTER
  const styleGroups = [
    // --- FEATURED RETRO & MMORPG CLASSICS ---
    {
        label: "MapleStory: Monsters & Bosses (وحوش وزعماء مابل)",
        id: "game_maplestory_monsters",
        options: [
            {id: 'maple-mushmom', label: 'Mushmom (머쉬맘 - Giant Mushroom Boss)', tags: ['Big Hop', 'Ground Tremor', 'Poison Spores', 'Jump Stomp', 'Angry Flash', 'Defeat Drop']},
            {id: 'maple-zakum', label: 'Zakum (자쿰 - 8-Armed Ancient Boss)', tags: ['8-Arm Float', 'Arm Slam', 'Fire Pillar', 'Ice Pillar', 'Laser Beam', 'Arm Fall Defeat']},
            {id: 'maple-pinkbean', label: 'Pink Bean (핑크빈 - Cute God of Destruction)', tags: ['Yo-Yo Spin', 'Mini Pogo Hop', 'Genesis Beam', 'Musical Notes', 'Popcorn Snack', 'Nap Time']},
            {id: 'maple-balrog', label: 'Crimson Balrog (크림슨 발록 - Airship Terror)', tags: ['Demon Hover', 'Claw Slash', 'Meteor Rain', 'Dark Roar', 'Flight Dive', 'Explode']},
            {id: 'maple-horntail', label: 'Horntail (혼테일 - 3-Headed Dragon Boss)', tags: ['3-Head Roar', 'Lightning Breath', 'Ice Breath', 'Tail Sweep', 'Wing Flap', 'Earthquake']},
            {id: 'maple-yeti-pepe', label: 'Yeti & Pepe (예티와 페페)', tags: ['Yeti Walk', 'Pepe Throw', 'Ice Punch', 'Heavy Stomp', 'Separate Duo', 'Cheer']},
            {id: 'maple-kingslime', label: 'King Slime (킹슬라임 - Giant Crown Boss)', tags: ['Heavy Squish', 'Mega Bounce', 'Mini-Slime Spawn', 'Crown Shine', 'Giant Splat']},
            {id: 'maple-mushroom', label: 'Orange Mushroom (주황버섯)', tags: ['Hop', 'Squash', 'High Bounce', 'Smiley Jump', 'Cap Spin', 'Defeat Drop']},
            {id: 'maple-slime', label: 'Green Slime (슬라임)', tags: ['Jiggle', 'Squish', 'Hop', 'Sparkle', 'Pop (Die)']},
            {id: 'maple-ribbonpig', label: 'Ribbon Pig (리본돼지)', tags: ['Trot', 'Red Ribbon Flutter', 'Headbutt Rush', 'Oink Panic', 'Roll Over']},
            {id: 'maple-wildboar', label: 'Wild Boar (와일드보어)', tags: ['Snort', 'Tusk Charge', 'Sprint', 'Dust Cloud', 'Knockback']},
            {id: 'maple-evil-eye', label: 'Evil Eye (이블아이)', tags: ['Float', 'Blink Eye', 'Tail Whip', 'Hypnotic Stare', 'Shrink']},
            {id: 'maple-lupin', label: 'Lupin (루팡 - Banana Monkey)', tags: ['Tree Perch', 'Banana Toss', 'Peel Slip', 'Scratch Head', 'Laugh']},
            {id: 'maple-pepe', label: 'Pepe (페페 - Mini Penguin)', tags: ['Waddle', 'Beak Peck', 'Belly Slide', 'Shiver', 'Squawk']}
        ]
    },
    {
        label: "MapleStory: Mounts & Vehicles (مطايا ومركبات مابل)",
        id: "game_maplestory_mounts",
        options: [
            {id: 'maple-mount-reddraco', label: 'Red Draco (التنين الأحمر المجنح)', tags: ['Hover Idle', 'Fly Dash', 'Fire Breath', 'Wing Flap', 'Landing', 'Roar Jump']},
            {id: 'maple-mount-shinjou', label: 'Shinjou (شينجو - البيغاسوس الملكي)', tags: ['Holy Aura Float', 'Glide Forward', 'Wing Beat', 'Feather Sparkle', 'Divine Neigh', 'Rest']},
            {id: 'maple-mount-silvermane', label: 'Silver Mane (الخنزير البري المدرع)', tags: ['Snort Trot', 'High Speed Charge', 'Tusk Ram', 'Dust Skidding', 'Leap', 'Halt']},
            {id: 'maple-mount-frog', label: 'Frog Mount (الضفدع النطاط اللطيف)', tags: ['Crouch Idle', 'Big Ribbit Hop', 'Tongue Catch', 'Water Splash', 'High Bounce', 'Squat']},
            {id: 'maple-mount-hotairballoon', label: 'Hot Air Balloon Bear (منطاد الدب الوردي)', tags: ['Float Drift', 'Burner Flame', 'Gentle Bob', 'Basket Sway', 'Altitude Rise', 'Land']},
            {id: 'maple-mount-kingcro', label: 'King Cro (التمساح الملكي)', tags: ['Slither Crawl', 'Jaw Snap', 'Tail Whip', 'Mud Slide', 'Roar', 'Bask']},
            {id: 'maple-mount-yeti', label: 'Yeti Mount (الييتي القطبي الضخم)', tags: ['Heavy Stomp', 'Chest Beat', 'Ice Leap', 'Snow Charge', 'Sit', 'Yeti Roar']},
            {id: 'maple-mount-toytank', label: 'Toy Tank (دبابة الألعاب الملونة)', tags: ['Tread Roll', 'Turret Spin', 'Toy Shell Shot', 'Exhaust Puff', 'Recoil Jolt', 'Brake']},
            {id: 'maple-mount-robot', label: 'Blue Mecha Robot (الروبوت المقاتل)', tags: ['Hover Thrust', 'Laser Cannon', 'Shield Guard', 'Rocket Boost', 'Hydraulic Step', 'Power Down']},
            {id: 'maple-mount-ostrich', label: 'Ostrich (النعامة السريعة)', tags: ['Sprint Run', 'Head Bob', 'Dust Trail', 'Peck Peck', 'High Jump', 'Skid Stop']},
            {id: 'maple-mount-ram', label: 'Ram (الكبش الصغير ذو القرون)', tags: ['Trot', 'Headbutt Charge', 'Horn Shake', 'Bell Jingling', 'Bounce Hop', 'Snort']},
            {id: 'maple-turtle', label: 'Turtle Mount (السلحفاة الأنيقة بربطة عنق)', tags: ['Steady Paddle', 'Shell Hide', 'Shell Spin', 'Blink Waddle', 'Puff Smoke', 'Rest']},
            {id: 'maple-mount-racecar', label: 'Maple Racing Car (سيارة الفورمولا)', tags: ['Engine Rev', 'High Speed Drift', 'Nitro Boost', 'Tire Smoke', 'Backfire', 'Victory Lap']},
            {id: 'maple-mount-rockinghorse', label: 'Rocking Horse (الحصان الهزاز)', tags: ['Rock Forward', 'Rock Backward', 'Wheel Roll', 'Neigh Bell', 'Spring Jump', 'Creak']},
            {id: 'maple-mount-watchhog', label: 'Watch Hog (خنزير الحراسة)', tags: ['Sniff Ground', 'Trot', 'Squeal Rush', 'Alert Stance', 'Roll Dirt', 'Oink']},
            {id: 'maple-mount-mimiana', label: 'Mimiana (طائر الميميانا المحارب)', tags: ['Flutter Walk', 'Helmet Tilt', 'Wing Glide', 'Peck Attack', 'Squawk', 'Perch']},
            {id: 'maple-mount-mimio', label: 'Mimio (طائر الميميو الأزرق)', tags: ['Little Waddle', 'Wing Flap', 'Sky Hop', 'Cute Chirp', 'Blink', 'Cuddle']},
            {id: 'maple-mount-magicsquare', label: 'Magic Square (الكرة السحرية العائمة)', tags: ['Mystic Pulse', 'Energy Orbit', 'Speed Float', 'Prism Glow', 'Teleport Flash', 'Hum']}
        ]
    },
    {
        label: "MapleStory: Pets & Companions (حيوانات مابل الأليفة)",
        id: "game_maplestory_pets",
        options: [
            {id: 'maple-pet-blackdragon', label: 'Black Dragon (التنين الأسود الصغير)', tags: ['Wing Flutter', 'Mini Flame Puff', 'Tail Wag', 'Roar Chirp', 'Sleep Coiled', 'Cheer']},
            {id: 'maple-pet-jrbalrog', label: 'Jr. Balrog (البالروغ الصغير اللطيف)', tags: ['Demon Hover', 'Mini Claw Swipe', 'Tiny Fireball', 'Angry Stomp', 'Sulky Nap', 'Evil Laugh']},
            {id: 'maple-pet-jrreaper', label: 'Jr. Reaper (حصاد الأرواح الصغير)', tags: ['Ghostly Float', 'Scythe Swing', 'Soul Sparkle', 'Spooky Hide', 'Float Sleep', 'Wail']},
            {id: 'maple-pet-crystalrudolph', label: 'Crystal Rudolph (غزال الكريستال المتلألئ)', tags: ['Crystal Antler Glow', 'Prance Trot', 'Sparkle Dust', 'Antler Bell', 'Lie Down', 'Joy Leap']},
            {id: 'maple-pet-dinoboy', label: 'Dino Boy (الديناصور الصغير اللطيف)', tags: ['Little Stomp', 'Tail Thump', 'Cute Roar', 'Bite Leaf', 'Tumble Roll', 'Happy Dance']},
            {id: 'maple-pet-panda', label: 'Panda (دب الباندا مع عود الخيزران)', tags: ['Bamboo Munch', 'Bumble Waddle', 'Roll Over', 'Yawn Scratch', 'Bamboo Swing', 'Nap']},
            {id: 'maple-pet-sunwukong', label: 'Sun Wu Kong (الملك القرد وو كونغ)', tags: ['Staff Twirl', 'Cloud Ride', 'Somersault', 'Scratch Ear', 'Battle Pose', 'Banana Snack']},
            {id: 'maple-pet-cloudleopard', label: 'Cloud Leopard (فهد السحاب المرقط)', tags: ['Prowl Stalk', 'Feline Pounce', 'Claw Scratch', 'Purr Rub', 'Lick Paw', 'Tail Flick']},
            {id: 'maple-pet-kino', label: 'Kino Mushroom (فطر كينو الأليف)', tags: ['Shy Wobble', 'Cap Shake', 'Happy Hop', 'Sweat Drop', 'Mini Spin', 'Snooze']},
            {id: 'maple-pet-whitetiger', label: 'White Tiger (النمر الأبيض الصغير)', tags: ['Playful Pounce', 'Tiger Stride', 'Baby Roar', 'Paw Swipe', 'Curl Up', 'Nuzzle']},
            {id: 'maple-pet-blackkitty', label: 'Black Kitty (القطة السوداء المرحة)', tags: ['Meow Arch', 'Tail Swish', 'Yarn Bat', 'Stretching Paws', 'Sleep Box', 'Purr']},
            {id: 'maple-pet-bluehusky', label: 'Blue Husky (كلب الهاسكي الأزرق)', tags: ['Tail Wag', 'Happy Bark', 'Snow Dig', 'Howl at Moon', 'Fetch Stick', 'Pant']},
            {id: 'maple-pet-elephant', label: 'Baby Elephant (الفيل الصغير)', tags: ['Trunk Water Spray', 'Heavy Baby Step', 'Ear Flap', 'Trunk Wave', 'Sit Dump', 'Trumpet']},
            {id: 'maple-pet-gorillarobo', label: 'Gorilla Robo (الروبوت الآلي غوريلا)', tags: ['Metallic Chest Beat', 'Rocket Punch', 'Copter Spin', 'Steam Vent', 'Servo Step', 'Recharge']},
            {id: 'maple-pet-greenrobo', label: 'Green Robo (الروبوت الآلي الأخضر)', tags: ['Radar Scan', 'Gear Whir', 'Plasma Spark', 'Step March', 'Antenna Flash', 'Standby']},
            {id: 'maple-pet-toucan', label: 'Toucan (طائر الطوقان الاستوائي)', tags: ['Beak Clack', 'Tropical Hop', 'Wing Flutter', 'Berry Catch', 'Feather Preen', 'Squawk']},
            {id: 'maple-pet-whitebunny', label: 'White Bunny (الأرنب الأبيض اللطيف)', tags: ['Ear Twitch', 'Carrot Nibble', 'High Hop', 'Nose Sniff', 'Thump Foot', 'Cuddle']},
            {id: 'maple-pet-whiteduck', label: 'White Duck (البطة البيضاء ذات الوشاح)', tags: ['Waddle Walk', 'Scarf Flutter', 'Quack Quack', 'Tail Wag', 'Water Splash', 'Preen']},
            {id: 'maple-pet-snowman', label: 'Snowman Pet (رجل الثلج الصغير)', tags: ['Wobble Slide', 'Snowball Toss', 'Hat Adjust', 'Melt Shiver', 'Freeze Solid', 'Smile']},
            {id: 'maple-pet-snail', label: 'Snail Pet (الحلزون الصغير ذو الزهرة)', tags: ['Slow Creep', 'Flower Bloom', 'Shell Duck', 'Antenna Twitch', 'Gleam Slime', 'Rest']}
        ]
    },
    {
        label: "MapleStory: Morphs (تحولات ومسوخ مابل السحرية)",
        id: "game_maplestory_morphs",
        options: [
            {id: 'maple-morph-greencornian', label: 'Green Cornian (تنين الكورنيان المحارب)', tags: ['Dragon Sword Slash', 'Shield Bash', 'Tail Whip', 'Battle Stomp', 'Draconic Roar', 'Wing Shield']},
            {id: 'maple-morph-barnardgrey', label: 'Barnard Grey (الفضائي الرمادي بارنارد)', tags: ['Alien Antenna Glow', 'Psychic Beam', 'Hover Float', 'Ray Gun Zap', 'Probe Scan', 'Vanish Beam']},
            {id: 'maple-morph-box', label: 'Mystery Box (صندوق الهدايا المتحرك)', tags: ['Box Wiggle', 'Lid Pop Surprise', 'Confetti Burst', 'Slide Shuffle', 'Hide Inside', 'Ribbon Snap']},
            {id: 'maple-morph-orangemushroom', label: 'Orange Mushroom Morph (تحول الفطر البرتقالي)', tags: ['Bouncy Hop', 'Cap Slam', 'Squish Defense', 'Mushroom Roll', 'Spore Cloud', 'Happy Jump']},
            {id: 'maple-morph-redsnail', label: 'Red Snail Morph (تحول الحلزون الأحمر)', tags: ['Red Shell Slide', 'Shell Spin Dash', 'Horn Poke', 'Tough Shell Guard', 'Retract', 'Peep Out']},
            {id: 'maple-morph-ribbonpig', label: 'Ribbon Pig Morph (تحول الخنزير ذو الشريط)', tags: ['Headlong Charge', 'Red Ribbon Flutter', 'Oink Dash', 'Tumble Knock', 'Happy Snort', 'Rest']}
        ]
    },
    {
        label: "MapleStory: Base Bodies & Skins (أجسام وبشرات مابل)",
        id: "game_maplestory_bodies",
        options: [
            {id: 'maple-body-light', label: 'Light Body (البشرة الفاتحة الطبيعية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-dark', label: 'Dark Body (البشرة السمراء الداكنة)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-pale', label: 'Pale Body (البشرة الشاحبة الخزفية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-tan', label: 'Tan Body (البشرة البرونزية التان)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-white', label: 'White Body (البشرة البيضاء الشبحية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-yellow', label: 'Yellow Body (البشرة الصفراء الكرتونية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-green', label: 'Green Body (البشرة الخضراء الفضائية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-blue', label: 'Blue Body (البشرة الزرقاء الجليدية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-red', label: 'Red Body (البشرة الحمراء النارية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']},
            {id: 'maple-body-gray', label: 'Gray Body (البشرة الرمادية المعدنية)', tags: ['Bouncing Idle', 'Chibi Walk', 'Sprint Run', 'Jump Air', 'Punch Strike', 'Crouch Prone', 'Hit Stun', 'Tombstone', 'Level Up Cheer']}
        ]
    },
    {
        label: "MapleStory: Heroes & Classes (أبطال وفئات مابل)",
        id: "game_maplestory_heroes",
        options: [
            {id: 'maple-warrior', label: 'Warrior / Hero', tags: ['Idle (Bouncing)', 'Walk', 'Slash', 'Power Strike', 'Jump Attack', 'Rest Chair', 'Tombstone (Die)', 'Level Up']},
            {id: 'maple-magician', label: 'Magician / Bishop', tags: ['Idle (Float)', 'Teleport', 'Magic Claw', 'Energy Bolt', 'Heal', 'Staff Spell', 'Sit Chair', 'Win']},
            {id: 'maple-bowman', label: 'Bowman / Archer', tags: ['Idle (Alert)', 'Arrow Blow', 'Double Shot', 'Draw Bow', 'Jump Shot', 'Eagle Fly', 'Hurt']},
            {id: 'maple-thief', label: 'Thief / Assassin', tags: ['Idle (Shadow)', 'Flash Jump', 'Lucky Seven', 'Double Stab', 'Haste', 'Shuriken Throw', 'Vanish']},
            {id: 'maple-pirate', label: 'Pirate / Brawler', tags: ['Idle (Punch)', 'Somersault Kick', 'Bullet Blast', 'Corkscrew', 'Dash', 'Octopus Summon']}
        ]
    },
    {
        label: "Shantae and the Pirate's Curse",
        id: "game_shantae",
        options: [
            {id: 'shantae-hero', label: 'Shantae (Half-Genie)', tags: ['Idle Stance', 'Hair Whip', 'Pistol Shot', 'Pirate Hat Glide', 'Scimitar Slash', 'Cannon Jump', 'Belly Dance', 'Victory']},
            {id: 'shantae-risky', label: 'Risky Boots (Pirate Queen)', tags: ['Pirate Laugh', 'Cutlass Slash', 'Flintlock Shot', 'Anchor Drop', 'Backflip', 'Command Orders']},
            {id: 'shantae-bolo', label: 'Bolo', tags: ['Flail Swing', 'Grapple Hook', 'Trip/Fall', 'Cheer Jump', 'Clumsy Guard']},
            {id: 'shantae-sky', label: 'Sky & Wrench', tags: ['Bird Whistle', 'Egg Bomb', 'Wrench Fly', 'Glide', 'Encouragement']},
            {id: 'shantae-rottytops', label: 'Rottytops (Zombie)', tags: ['Zombie Walk', 'Leg Throw', 'Head Detach', 'Hug/Bite', 'Casual Wave']},
            {id: 'shantae-tinkerbat', label: 'Tinkerbat (Pirate Minion)', tags: ['Cutlass Jab', 'Cannon Load', 'Run Panic', 'Salute', 'Poof (Defeat)']}
        ]
    },
    {
        label: "Disney's Tarzan (1999 Platformer)",
        id: "game_tarzan",
        options: [
            {id: 'tarzan-adult', label: 'Tarzan (Adult Hero)', tags: ['Jungle Idle', 'Sprint', 'Spear Jab', 'Knife Slash', 'Vine Swing', 'Tree Slide', 'Ground Slam', 'Chest Beat Yell']},
            {id: 'tarzan-young', label: 'Young Tarzan', tags: ['Scramble Run', 'Fruit Throw', 'Somersault Jump', 'Tree Slide', 'Chimp Play', 'Curious']},
            {id: 'tarzan-terk', label: 'Terk (Terkina)', tags: ['Chest Beat', 'Rolling Tumble', 'Banana Throw', 'Laugh', 'Tantrum', 'Dance']},
            {id: 'tarzan-tantor', label: 'Tantor (Elephant)', tags: ['Trunk Slam', 'Trumpet Panic', 'Heavy Stomp', 'Charge', 'Peanut Snack']},
            {id: 'tarzan-jane', label: 'Jane Porter', tags: ['Parasol Glide', 'Sketchpad Draw', 'Baboon Escape Run', 'Polite Wave', 'Cheer']},
            {id: 'tarzan-clayton', label: 'Clayton (Hunter)', tags: ['Shotgun Blast', 'Machete Slash', 'Axe Chop', 'Cigar Scowl', 'Rage Yell']},
            {id: 'tarzan-sabor', label: 'Sabor (Leopard Boss)', tags: ['Stalk', 'Pounce', 'Claw Swipe', 'Fierce Growl', 'Leap Attack', 'Defeat']}
        ]
    },

    // --- MODERN MOBILE & UBIART ---
    {
        label: "Super Mario Run (Mobile)",
        id: "game_mariorun",
        options: [
            {id: 'mrun-mario', label: 'Mario', tags: ['Run', 'Jump', 'Vault', 'Roll', 'Wall Jump', 'Spin', 'Bubble', 'Victory']},
            {id: 'mrun-luigi', label: 'Luigi', tags: ['Run', 'Scuttle Jump', 'High Jump', 'Roll', 'Wall Slide', 'Scared']},
            {id: 'mrun-peach', label: 'Peach', tags: ['Run', 'Float', 'Skirt Float', 'Roll', 'Blow Kiss', 'Win']},
            {id: 'mrun-toad', label: 'Toad', tags: ['Run Fast', 'Jump', 'Trip', 'Cheer', 'Cry']},
            {id: 'mrun-toadette', label: 'Toadette', tags: ['Run', 'Float', 'Pigtail Spin', 'Happy']},
            {id: 'mrun-yoshi', label: 'Yoshi', tags: ['Run', 'Flutter Jump', 'Tongue', 'Egg Lay', 'Ground Pound']},
            {id: 'mrun-daisy', label: 'Daisy', tags: ['Run', 'Double Jump', 'Flower Effect', 'Hi!']}
        ]
    },
    {
        label: "Rayman Adventures (UbiArt)",
        id: "game_raymanadv",
        options: [
            {id: 'radv-rayman', label: 'Rayman', tags: ['Run', 'Jump', 'Hover (Hair)', 'Punch', 'Wall Run', 'Swim', 'Guitar']},
            {id: 'radv-globox', label: 'Globox', tags: ['Slap', 'Belly Bounce', 'Run (Clumsy)', 'Scared', 'Rain Dance']},
            {id: 'radv-barbara', label: 'Barbara', tags: ['Axe Swing', 'Slide', 'Jump', 'Helmet Bash', 'Rock Out']},
            {id: 'radv-teensie', label: 'Teensie', tags: ['Magic Blast', 'Float', 'Spin', 'Bow']},
            {id: 'radv-murfy', label: 'Murfy', tags: ['Fly', 'Tickle', 'Cut Rope', 'Shield', 'Smile']},
            {id: 'radv-betilla', label: 'Betilla', tags: ['Float', 'Cast Spell', 'Pose', 'Wink']}
        ]
    },

    // --- ORIGINAL CLASSICS ---
    {
        label: "Metal Slug Anthology (Neo Geo)",
        id: "game_ms",
        options: [
            {id: 'ms-marco', label: 'Marco Rossi (Hero)', tags: ['Pistol', 'Heavy Machine Gun', 'Knife', 'Grenade', 'Look Up', 'Victory', 'Hurt', 'Die']},
            {id: 'ms-tarma', label: 'Tarma Roving', tags: ['Pistol', 'Shotgun', 'Kick', 'Vehicle Pilot', 'Sunglasses', 'Laugh']},
            {id: 'ms-eri', label: 'Eri Kasamoto', tags: ['Pistol', 'Grenade Throw', 'Bandana', 'Explosion', 'Jump']},
            {id: 'ms-fio', label: 'Fio Germi', tags: ['Pistol', 'Sandwich Eat', 'Push Glasses', 'Panic', 'Victory']},
            {id: 'ms-soldier', label: 'Rebel Soldier', tags: ['Idle', 'Panic', 'Shoot Rifle', 'Knife Slash', 'Shield', 'Scream', 'Burn', 'Die']},
            {id: 'ms-arabian', label: 'Arabian Soldier', tags: ['Scimitar Slash', 'Camel Ride', 'Throw Knife', 'Fire Breath']},
            {id: 'ms-mars', label: 'Mars People (Alien)', tags: ['Hover', 'Teleport', 'Ray Gun', 'Spores', 'Wiggle', 'Die (Splat)']},
            {id: 'ms-tank', label: 'Metal Slug (SV-001)', tags: ['Move', 'Cannon Fire', 'Vulcan Fire', 'Jump', 'Crouch', 'Explode']}
        ]
    },
    {
        label: "Sonic The Hedgehog (Genesis Era)",
        id: "game_sonic",
        options: [
            {id: 'sonic-sonic', label: 'Sonic', tags: ['Idle (Tap foot)', 'Run', 'Spin Dash', 'Spring', 'Skid', 'Hurt', 'Drown', 'Win']},
            {id: 'sonic-tails', label: 'Tails', tags: ['Fly', 'Run', 'Spin', 'Look Up', 'Tired', 'Hurt', 'Win']},
            {id: 'sonic-knuckles', label: 'Knuckles', tags: ['Glide', 'Climb', 'Punch', 'Spin', 'Hurt', 'Laugh']},
            {id: 'sonic-shadow', label: 'Shadow (Pixel Style)', tags: ['Skate', 'Chaos Control', 'Cross Arms', 'Spin']},
            {id: 'sonic-motobug', label: 'Moto Bug', tags: ['Move', 'Turn', 'Smoke', 'Explode']},
            {id: 'sonic-eggman', label: 'Dr. Eggman', tags: ['Eggmobile', 'Laugh', 'Hit', 'Escape', 'Panic', 'Press Button']}
        ]
    },
    
    // --- DISNEY GAMES SEPARATED ---
    {
        label: "Disney's Aladdin (Genesis)",
        id: "game_aladdin",
        options: [
            {id: 'aladdin-hero', label: 'Aladdin', tags: ['Idle (Pants)', 'Run', 'Sword Slash', 'Throw Apple', 'Look Up', 'Crouch', 'Rope Climb', 'Hurt']},
            {id: 'aladdin-abu', label: 'Abu (Monkey)', tags: ['Idle', 'Jump', 'Taunt', 'Steal', 'Run', 'Panic']},
            {id: 'aladdin-genie', label: 'Genie', tags: ['Float', 'Magic Zap', 'Morph Face', 'Slot Machine', 'Laugh', 'Vanish']},
            {id: 'aladdin-jasmine', label: 'Princess Jasmine', tags: ['Idle', 'Walk', 'Scold', 'Hug', 'Surprised']},
            {id: 'aladdin-jafar', label: 'Jafar', tags: ['Staff Stance', 'Snake Staff Beam', 'Laugh', 'Summon Spell', 'Defeat']},
            {id: 'aladdin-jafar-snake', label: 'Giant Snake Jafar', tags: ['Coil', 'Bite', 'Strike', 'Hiss', 'Die']},
            {id: 'aladdin-guard-fat', label: 'Fat Guard', tags: ['Idle (Laugh)', 'Scimitar Slash', 'Throw Knife', 'Pants Drop', 'Burned']},
            {id: 'aladdin-guard-thin', label: 'Thin Guard', tags: ['Idle', 'Stab', 'Throw Knife', 'Block', 'Knocked Out']},
            {id: 'aladdin-skeleton', label: 'Dungeon Skeleton', tags: ['Explode', 'Bone Throw', 'Walk', 'Crumble']},
            {id: 'aladdin-iago', label: 'Iago', tags: ['Fly', 'Scream', 'Feather Loss', 'Perch']}
        ]
    },
    {
        label: "The Lion King",
        id: "game_lionking",
        options: [
            {id: 'lion-simba-cub', label: 'Simba (Cub)', tags: ['Idle (Butterfly)', 'Run', 'Roar (Weak)', 'Jump', 'Roll', 'Hurt', 'Hang']},
            {id: 'lion-simba-adult', label: 'Simba (Adult)', tags: ['Idle (Proud)', 'Run (Gallop)', 'Maul (Slap)', 'Roar (Strong)', 'Pounce']},
            {id: 'lion-nala', label: 'Nala', tags: ['Idle', 'Pounce', 'Pin', 'Lick']},
            {id: 'lion-timon', label: 'Timon', tags: ['Walk', 'Talk', 'Hula Dance', 'Scared']},
            {id: 'lion-pumbaa', label: 'Pumbaa', tags: ['Trot', 'Eat Bug', 'Burp', 'Charge']},
            {id: 'lion-scar', label: 'Scar', tags: ['Stalk', 'Claw Strike', 'Taunt', 'Pounce', 'Defeat']},
            {id: 'lion-hyena', label: 'Hyena (Shenzi/Banzai)', tags: ['Laugh', 'Bite', 'Pant', 'Run', 'Die']},
            {id: 'lion-rafiki', label: 'Rafiki', tags: ['Staff Hit', 'Kung Fu', 'Meditate', 'Laugh']},
            {id: 'lion-vulture', label: 'Vulture', tags: ['Fly', 'Swoop', 'Perch', 'Feathers Fly']}
        ]
    },
    {
        label: "Mickey Mania",
        id: "game_mickeymania",
        options: [
            {id: 'mmania-mickey', label: 'Mickey (Standard)', tags: ['Idle (Tap Foot)', 'Run', 'Marble Throw', 'Jump', 'Scared', 'Victory']},
            {id: 'mmania-steamboat', label: 'Steamboat Willie', tags: ['Idle (Whistle)', 'Wheel Spin', 'B/W Run', 'Jump']},
            {id: 'mmania-doctor', label: 'Mad Doctor Mickey', tags: ['Run', 'Potion Throw', 'Scared']},
            {id: 'mmania-pete', label: 'Peg Leg Pete', tags: ['Stomp', 'Throw Bomb', 'Laugh', 'Defeat']},
            {id: 'mmania-ghost', label: 'Lonesome Ghost', tags: ['Float', 'Boo', 'Vanish', 'Scare']},
            {id: 'mmania-moose', label: 'Moose', tags: ['Charge', 'Stop', 'Crash']}
        ]
    },
    {
        label: "Castle of Illusion",
        id: "game_castleillusion",
        options: [
            {id: 'castle-mickey', label: 'Mickey Mouse', tags: ['Idle (Bounce)', 'Walk', 'Butt Drop (Bounce)', 'Throw Apple', 'Duck', 'Hurt']},
            {id: 'castle-minnie', label: 'Minnie Mouse', tags: ['Idle', 'Wave', 'Scared', 'Happy']},
            {id: 'castle-mizrabel', label: 'Mizrabel (Witch)', tags: ['Float', 'Cast Spell', 'Spin', 'Laugh', 'Transform']},
            {id: 'castle-soldier', label: 'Toy Soldier', tags: ['March', 'Aim', 'Wind Up', 'Break']},
            {id: 'castle-mushroom', label: 'Angry Mushroom', tags: ['Walk', 'Jump', 'Squish']},
            {id: 'castle-spider', label: 'Spider', tags: ['Hang', 'Drop', 'Crawl', 'Bite']}
        ]
    },
    {
        label: "World of Illusion",
        id: "game_worldillusion",
        options: [
            {id: 'world-mickey', label: 'Mickey (Magician)', tags: ['Cape Swish', 'Magic Flourish', 'Crawl', 'Run', 'Pull Rope']},
            {id: 'world-donald', label: 'Donald (Magician)', tags: ['Idle (Angry)', 'Stuck', 'Magic Fail', 'Run', 'Butt Wiggle']},
            {id: 'world-pete', label: 'Pete (Shark)', tags: ['Swim', 'Bite', 'Laugh', 'Defeat']},
            {id: 'world-cards', label: 'Card Soldiers', tags: ['March', 'Spear Thrust', 'Shuffle', 'Fall']}
        ]
    },
    {
        label: "QuackShot",
        id: "game_quackshot",
        options: [
            {id: 'quack-donald', label: 'Donald Duck', tags: ['Idle (Hat adjust)', 'Run', 'Shoot Plunger', 'Popcorn Eat', 'Tantrum', 'Slide']},
            {id: 'quack-pete', label: 'Pete (Villain)', tags: ['Order', 'Shoot', 'Laugh', 'Stomp']},
            {id: 'quack-dracula', label: 'Count Dracula', tags: ['Cape Hide', 'Teleport', 'Bite', 'Bat Form']},
            {id: 'quack-ghost', label: 'Ghost', tags: ['Float', 'Boo', 'Fade']},
            {id: 'quack-tiger', label: 'Tiger', tags: ['Prowl', 'Roar', 'Jump', 'Sleep']}
        ]
    },
    {
        label: "The Jungle Book",
        id: "game_junglebook",
        options: [
            {id: 'jungle-mowgli', label: 'Mowgli', tags: ['Idle', 'Run', 'Banana Throw', 'Climb Vine', 'Bungee', 'Victory']},
            {id: 'jungle-baloo', label: 'Baloo', tags: ['Walk', 'Dance', 'Scratch Back', 'Roar']},
            {id: 'jungle-bagheera', label: 'Bagheera', tags: ['Prowl', 'Jump', 'Sit', 'Growl']},
            {id: 'jungle-sherekhan', label: 'Shere Khan', tags: ['Stalk', 'Claw', 'Roar', 'Jump', 'Defeat']},
            {id: 'jungle-kaa', label: 'Kaa', tags: ['Hypnotize', 'Coil', 'Strike', 'Fall']},
            {id: 'jungle-louie', label: 'King Louie', tags: ['Dance', 'Throw Fruit', 'Swing', 'Laugh']},
            {id: 'jungle-monkey', label: 'Monkey', tags: ['Run', 'Throw Coconut', 'Hang', 'Fall']}
        ]
    },
    {
        label: "Gargoyles",
        id: "game_gargoyles",
        options: [
            {id: 'garg-goliath', label: 'Goliath', tags: ['Idle (Cloak)', 'Run (All fours)', 'Claw Slash', 'Wall Climb', 'Glide', 'Roar', 'Stone Form']},
            {id: 'garg-demona', label: 'Demona', tags: ['Laser Rifle', 'Fly', 'Claw', 'Laugh', 'Angry']},
            {id: 'garg-viking', label: 'Viking Warrior', tags: ['Axe Swing', 'Block', 'Walk', 'Die']},
            {id: 'garg-robot', label: 'Steel Clan Robot', tags: ['Fly', 'Shoot Laser', 'Punch', 'Explode']},
            {id: 'garg-xanatos', label: 'Xanatos (Armor)', tags: ['Shoot', 'Fly', 'Taunt', 'Defeat']}
        ]
    },
    {
        label: "Toy Story",
        id: "game_toystory",
        options: [
            {id: 'toy-woody', label: 'Woody', tags: ['Idle', 'Run (Floppy)', 'Whip String', 'Jump', 'Fall with Style', 'Crouch']},
            {id: 'toy-buzz', label: 'Buzz Lightyear', tags: ['Idle (Heroic)', 'Laser', 'Wings Open', 'Fly/Fall', 'Karate Chop']},
            {id: 'toy-rex', label: 'Rex', tags: ['Roar', 'Walk', 'Tail Swing', 'Scared']},
            {id: 'toy-hamm', label: 'Hamm', tags: ['Walk', 'Coin Shot', 'Sit']},
            {id: 'toy-alien', label: 'Alien', tags: ['Ooooh', 'Walk', 'Claw Grab']},
            {id: 'toy-sid-toy', label: 'Babyhead Spider', tags: ['Crawl', 'Snap', 'Scare']}
        ]
    },
    {
        label: "TaleSpin",
        id: "game_talespin",
        options: [
            {id: 'tale-baloo', label: 'Baloo (Pilot)', tags: ['Plane Fly', 'Shoot', 'Flip', 'Crash', 'Thumbs Up']},
            {id: 'tale-kit', label: 'Kit Cloudkicker', tags: ['Air Foil Surf', 'Slingshot', 'Jump', 'Catch']},
            {id: 'tale-karnage', label: 'Don Karnage', tags: ['Sword Fight', 'Order Minions', 'Rant', 'Defeat']},
            {id: 'tale-pirate', label: 'Air Pirate', tags: ['Shoot', 'Fly Plane', 'Parachute', 'Crash']}
        ]
    },
    {
        label: "Disney's Ariel: The Little Mermaid",
        id: "game_ariel",
        options: [
            {id: 'ariel-ariel', label: 'Ariel', tags: ['Swim', 'Sing', 'Tail Flip', 'Dodge', 'Use Trident', 'Surprised']},
            {id: 'ariel-triton', label: 'King Triton', tags: ['Trident Blast', 'Command', 'Angry', 'Hug']},
            {id: 'ariel-ursula', label: 'Ursula', tags: ['Laugh', 'Tentacle Slap', 'Grow', 'Magic Blast', 'Transform']},
            {id: 'ariel-flotsam', label: 'Flotsam/Jetsam', tags: ['Swim', 'Bite', 'Glow Eye', 'Coil']},
            {id: 'ariel-shark', label: 'Shark', tags: ['Chomp', 'Swim Fast', 'Stunned']}
        ]
    },
    {
        label: "Beauty and the Beast: Belle's Quest",
        id: "game_belle",
        options: [
            {id: 'belle-belle', label: 'Belle', tags: ['Idle (Book)', 'Walk', 'Crouch', 'Gasp', 'Jump', 'Push']},
            {id: 'belle-beast', label: 'The Beast (NPC)', tags: ['Roar', 'Brood', 'Walk', 'Dance']},
            {id: 'belle-gaston', label: 'Gaston', tags: ['Flex', 'Laugh', 'Punch', 'Mob Lead']},
            {id: 'belle-lefou', label: 'Lefou', tags: ['Trip', 'Cheer', 'Run', 'Hurt']},
            {id: 'belle-wolf', label: 'Wolf', tags: ['Growl', 'Bite', 'Run', 'Whimper']}
        ]
    },
    {
        label: "Beauty and the Beast: Roar of the Beast",
        id: "game_roar",
        options: [
            {id: 'roar-beast', label: 'The Beast', tags: ['Idle (Hunch)', 'Roar', 'Claw Swipe', 'Run (Four legs)', 'Stomp', 'Hurt']},
            {id: 'roar-gaston', label: 'Gaston (Boss)', tags: ['Shoot Blunderbuss', 'Stab', 'Punch', 'Fall']},
            {id: 'roar-wolf', label: 'Wolf', tags: ['Jump Attack', 'Bite', 'Howl', 'Die']},
            {id: 'roar-bat', label: 'Bat', tags: ['Fly', 'Swoop', 'Screech']}
        ]
    },

    // --- CARTOON GAMES SEPARATED ---
    {
        label: "Tiny Toon Adventures: Buster's Hidden Treasure",
        id: "game_tinytoons",
        options: [
            {id: 'tiny-buster', label: 'Buster Bunny', tags: ['Idle', 'Run', 'Slide', 'Jump', 'Dizzy', 'Wall Jump', 'Drop']},
            {id: 'tiny-babs', label: 'Babs Bunny', tags: ['Idle', 'Wink', 'Costume Change', 'Run']},
            {id: 'tiny-plucky', label: 'Plucky Duck', tags: ['Fly', 'Swim', 'Anvil Drop', 'Complain']},
            {id: 'tiny-hampton', label: 'Hamton J. Pig', tags: ['Clean', 'Roll', 'Eat', 'Scared']},
            {id: 'tiny-elmyra', label: 'Elmyra Duff', tags: ['Chase', 'Hug', 'Kiss', 'Cry', 'Grab']},
            {id: 'tiny-max', label: 'Montana Max', tags: ['Throw Money', 'Mech Ride', 'Laugh', 'Tantrum']},
            {id: 'tiny-dizzy', label: 'Dizzy Devil', tags: ['Spin', 'Eat', 'Stop', 'Tongue']}
        ]
    },
    {
        label: "The Adventures of Batman & Robin (Genesis)",
        id: "game_batman",
        options: [
            {id: 'bat-batman', label: 'Batman', tags: ['Idle (Cape)', 'Punch Combo', 'Batarang', 'Grapple', 'Cape Glide', 'Block', 'Kick']},
            {id: 'bat-robin', label: 'Robin', tags: ['Idle', 'Staff Combo', 'Jump Kick', 'Grapple', 'Hurt']},
            {id: 'bat-joker', label: 'The Joker', tags: ['Laugh', 'Bomb Throw', 'Cane Strike', 'Flower Spray', 'Defeat']},
            {id: 'bat-harley', label: 'Harley Quinn', tags: ['Hammer Smash', 'Cartwheel', 'Laugh', 'Pistol']},
            {id: 'bat-freeze', label: 'Mr. Freeze', tags: ['Ice Beam', 'Walk', 'Armor Break', 'Monologue']},
            {id: 'bat-hatter', label: 'Mad Hatter', tags: ['Throw Hat', 'Tea Drink', 'Float', 'Run']},
            {id: 'bat-thug', label: 'Goon', tags: ['Shoot', 'Punch', 'Knife', 'Knockout']}
        ]
    },
    {
        label: "TMNT: The Hyperstone Heist",
        id: "game_hyperstone",
        options: [
            {id: 'tmnt-leo', label: 'Leonardo', tags: ['Idle', 'Walk', 'Sword Combo', 'Jump Kick', 'Special Spin', 'Hurt']},
            {id: 'tmnt-don', label: 'Donatello', tags: ['Idle', 'Staff Reach', 'Staff Vault', 'Special']},
            {id: 'tmnt-raph', label: 'Raphael', tags: ['Idle', 'Sai Stab', 'Bite', 'Special']},
            {id: 'tmnt-mike', label: 'Michelangelo', tags: ['Idle', 'Nunchuck Spin', 'Party Dude', 'Special']},
            {id: 'tmnt-shredder', label: 'Shredder', tags: ['Laugh', 'Sword Glow', 'Teleport', 'Mutate', 'Defeat']},
            {id: 'tmnt-krang', label: 'Krang', tags: ['Walker Stomp', 'Brain Pulse', 'Laugh', 'Exit']},
            {id: 'tmnt-rocksteady', label: 'Rocksteady', tags: ['Charge', 'Shoot', 'Stumble', 'Hit']},
            {id: 'tmnt-bebop', label: 'Bebop', tags: ['Punch', 'Whip', 'Run', 'Hit']},
            {id: 'tmnt-foot', label: 'Foot Soldier', tags: ['Ninja Kick', 'Throw Star', 'Sword', 'Explode']}
        ]
    },
    {
        label: "Tom and Jerry: Frantic Antics!",
        id: "game_tomjerry",
        options: [
            {id: 'tj-tom', label: 'Tom Cat', tags: ['Sneak', 'Run', 'Pan Hit', 'Yell (Pain)', 'Bomb Explode', 'Flattened']},
            {id: 'tj-jerry', label: 'Jerry Mouse', tags: ['Idle (Cheese)', 'Run', 'Throw Marble', 'Laugh', 'Win', 'Cheer']},
            {id: 'tj-spike', label: 'Spike Bulldog', tags: ['Sleep', 'Bark', 'Bite', 'Chase', 'Grab']},
            {id: 'tj-nibbles', label: 'Nibbles', tags: ['Eat', 'Run', 'Diaper Adjust', 'Fall']}
        ]
    },
    {
        label: "Taz-Mania",
        id: "game_tazmania",
        options: [
            {id: 'taz-taz', label: 'Taz', tags: ['Idle (Drool)', 'Tornado Spin', 'Eat', 'Burp', 'Lift Object', 'Walk (Arms up)']},
            {id: 'taz-bushrat', label: 'Bushrat', tags: ['Run', 'Squeak', 'Hiding']},
            {id: 'taz-francis', label: 'Francis X. Bushlad', tags: ['Sneak', 'Trap Set', 'Run', 'Caught']},
            {id: 'taz-gator', label: 'Bull Gator', tags: ['Chomp', 'Walk', 'Spin']}
        ]
    },
    {
        label: "The Pirates of Dark Water",
        id: "game_darkwater",
        options: [
            {id: 'dark-ren', label: 'Ren', tags: ['Sword Stance', 'Slash', 'Jump', 'Hurt', 'Magic']},
            {id: 'dark-ioz', label: 'Ioz', tags: ['Punch', 'Shoulder Bash', 'Flex', 'Angry']},
            {id: 'dark-tula', label: 'Tula', tags: ['Acrobatic Kick', 'Flip', 'Staff', 'Cast']},
            {id: 'dark-niddler', label: 'Niddler', tags: ['Fly', 'Scratch', 'Eat Fruit', 'Squawk']},
            {id: 'dark-bloth', label: 'Bloth', tags: ['Laugh', 'Order Attack', 'Sword Fight', 'Defeat']},
            {id: 'dark-konk', label: 'Konk', tags: ['Sneak', 'Point', 'Run', 'Fall']}
        ]
    },
    {
        label: "The Smurfs",
        id: "game_smurfs",
        options: [
            {id: 'smurf-hefty', label: 'Hefty Smurf', tags: ['Idle', 'Run', 'Jump', 'Lift', 'Punch']},
            {id: 'smurf-brainy', label: 'Brainy Smurf', tags: ['Talk', 'Read', 'Thrown', 'Glasses Adjust']},
            {id: 'smurf-smurfette', label: 'Smurfette', tags: ['Walk', 'Wave', 'Flower', 'Kiss']},
            {id: 'smurf-papa', label: 'Papa Smurf', tags: ['Magic', 'Mix Potion', 'Command']},
            {id: 'smurf-gargamel', label: 'Gargamel', tags: ['Creep', 'Net Swing', 'Fall', 'Yell at Azrael']},
            {id: 'smurf-azrael', label: 'Azrael', tags: ['Hiss', 'Run', 'Scratch', 'Sleep']}
        ]
    },

    // --- OTHER PRESERVED GAMES ---
    {
        label: "Super Mario Bros (16-bit)",
        id: "game_mario",
        options: [
            {id: 'mario-mario', label: 'Mario', tags: ['Idle', 'Run', 'Jump', 'Duck', 'Fireball', 'Cape Spin', 'Pipe', 'Die']},
            {id: 'mario-luigi', label: 'Luigi', tags: ['Idle', 'Scuttle Jump', 'Slide', 'Fireball', 'Scared']},
            {id: 'mario-peach', label: 'Princess Peach', tags: ['Float', 'Slap', 'Umbrella', 'Pick Vegetable', 'Win']},
            {id: 'mario-goomba', label: 'Goomba', tags: ['Walk', 'Flattened', 'Flip']},
            {id: 'mario-koopa', label: 'Koopa Troopa', tags: ['Walk', 'Shell Hide', 'Shell Spin', 'Wings Fly']},
            {id: 'mario-bowser', label: 'Bowser', tags: ['Fire Breath', 'Jump Stomp', 'Shell Spin', 'Retreat', 'Defeat']}
        ]
    },
    {
        label: "Mega Man X (SNES Series)",
        id: "game_mmx",
        options: [
            {id: 'mmx-x', label: 'Mega Man X', tags: ['Run', 'Dash', 'Wall Slide', 'Shoot', 'Charge Shot', 'Hurt', 'Die', 'Teleport']},
            {id: 'mmx-zero', label: 'Zero', tags: ['Dash', 'Saber Slash', 'Buster Shot', 'Wall Jump', 'Teleport', 'Hurt', 'Die']},
            {id: 'mmx-vile', label: 'Vile', tags: ['Idle', 'Ride Armor', 'Shoulder Cannon', 'Laugh', 'Stun', 'Defeat']},
            {id: 'mmx-sigma', label: 'Sigma', tags: ['Cape Throw', 'Saber Eye', 'Laugh', 'Virus Form']}
        ]
    },
    {
        label: "Castlevania (SOTN Style)",
        id: "game_cv",
        options: [
            {id: 'cv-alucard', label: 'Alucard', tags: ['Idle', 'Run (Trail)', 'Sword Slash', 'Mist Form', 'Bat Form', 'Wolf Form', 'Coffin Sleep']},
            {id: 'cv-simon', label: 'Simon Belmont (Classic)', tags: ['Whip', 'Throw Axe', 'Throw Cross', 'Stair Climb', 'Hurt']},
            {id: 'cv-dracula', label: 'Dracula', tags: ['Teleport', 'Fireballs', 'Glass Break', 'Monster Form']},
            {id: 'cv-skeleton', label: 'Skeleton', tags: ['Bone Throw', 'Walk', 'Crumble']},
            {id: 'cv-armor', label: 'Axe Armor', tags: ['Heavy Walk', 'Axe Throw', 'Guard', 'Break']}
        ]
    },
    {
        label: "Crash Bandicoot (PS1)",
        id: "game_crash",
        options: [
            {id: 'crash-crash', label: 'Crash Bandicoot', tags: ['Idle', 'Run', 'Spin', 'Jump', 'Belly Flop', 'Wumpa Eat', 'Mask On', 'Angel Die']},
            {id: 'crash-coco', label: 'Coco Bandicoot', tags: ['Idle', 'Run', 'Laptop Hack', 'Tiger Ride', 'Spin', 'Jump', 'Win', 'Lose']},
            {id: 'crash-cortex', label: 'Dr. Neo Cortex', tags: ['Idle', 'Hoverboard', 'Shoot Laser', 'Laugh', 'Rant', 'Explosion', 'Fall', 'Teleport']},
            {id: 'crash-ngin', label: 'N. Gin', tags: ['Mech Walk', 'Missile Fire', 'Tantrum']},
            {id: 'crash-tiny', label: 'Tiny Tiger', tags: ['Roar', 'Jump Squash', 'Fork Attack', 'Flex']},
            {id: 'crash-lab', label: 'Lab Assistant', tags: ['Idle', 'Flask Throw', 'Shield', 'Hit', 'Fall']}
        ]
    },
    {
        label: "Captain Claw (1997)",
        id: "game_claw",
        options: [
          {id: 'claw-captain', label: 'Captain Claw', tags: ['Idle', 'Run', 'Jump', 'Sword Slash', 'Pistol Shot', 'Magic Claw', 'Duck', 'Lift Object']},
          {id: 'claw-redtail', label: 'Red Tail', tags: ['Idle', 'Laugh', 'Sword Lunge', 'Jump Attack', 'Block', 'Hurt', 'Dying', 'Taunt']},
          {id: 'claw-omar', label: 'Omar', tags: ['Idle', 'Bomb Throw', 'Camel Stomp', 'Scimitar Slash', 'Guard', 'Hit', 'Faint', 'Jump']},
          {id: 'claw-officer', label: 'Cocker Spaniel Officer', tags: ['Patrol', 'Alert', 'Sword Thrust', 'Shoot Musket', 'Block', 'Hurt', 'Die', 'Salute']},
          {id: 'claw-pirate', label: 'Rat Pirate', tags: ['Idle', 'Walk', 'Dagger Stab', 'Throw Knife', 'Dodge', 'Hurt', 'Fall', 'Drink Grog']}
        ]
    },
    {
        label: "Jazz Jackrabbit 2",
        id: "game_jazz",
        options: [
            {id: 'jazz-jazz', label: 'Jazz Jackrabbit', tags: ['Idle (Cool)', 'Run (Blur)', 'Super Jump', 'Shoot Blaster', 'Uppercut', 'Helicopter Ears', 'Hurt', 'Victory']},
            {id: 'jazz-spaz', label: 'Spaz Jackrabbit', tags: ['Idle (Crazy)', 'Dash', 'Double Jump', 'Karate Kick', 'Shoot', 'Eat Bird', 'Electrocuted', 'Laugh']},
            {id: 'jazz-lori', label: 'Lori Jackrabbit', tags: ['Idle', 'Sprint', 'High Jump', 'Shoot', 'Roundhouse Kick', 'Dodge', 'Hurt', 'Pose']},
            {id: 'jazz-turtle', label: 'Turtle Trooper', tags: ['Walk', 'Shell Hide', 'Bite', 'Spin Attack', 'Flipped Over', 'Die', 'Patrol', 'Alert']},
            {id: 'jazz-devan', label: 'Devan Shell', tags: ['Idle', 'Jetpack Fly', 'Shoot Laser', 'Stomp', 'Robot Mech', 'Laugh', 'Defeat', 'Escape']}
        ]
    },
    {
        label: "Earthworm Jim",
        id: "game_ewj",
        options: [
            {id: 'ewj-jim', label: 'Earthworm Jim', tags: ['Idle (Flex)', 'Run', 'Head Whip', 'Shoot Plasma', 'Helicopter Head', 'Tarzan Swing', 'Inflated', 'Ash Pile']},
            {id: 'ewj-peter', label: 'Peter Puppy', tags: ['Idle (Cute)', 'Walk', 'Morph Monster', 'Monster Attack', 'Monster Roar', 'Transform Back', 'Scared', 'Happy']},
            {id: 'ewj-psycrow', label: 'Psy-Crow', tags: ['Idle', 'Jetpack Fly', 'Hook Attack', 'Shoot Gun', 'Dodge', 'Hit', 'Spin Out', 'Taunt']},
            {id: 'ewj-bob', label: 'Bob the Goldfish', tags: ['Idle in Bowl', 'Bowl Smash', 'Minion Attack', 'Order Attack', 'Gasp', 'Glass Break', 'Flopping', 'Defeat']},
            {id: 'ewj-snot', label: 'Major Mucus', tags: ['Idle (Drip)', 'Slide', 'Whip Attack', 'Bungee Jump', 'Stick', 'Splat', 'Reform', 'Die']}
        ]
    },
    {
        label: "Rayman (Original)",
        id: "game_rayman",
        options: [
            {id: 'rayman-rayman', label: 'Rayman', tags: ['Idle (Grimace)', 'Walk', 'Helicopter', 'Punch', 'Hang', 'Victory', 'Hurt', 'Charge Fist']},
            {id: 'rayman-globox', label: 'Globox', tags: ['Idle', 'Panic Run', 'Rain Dance', 'Slap', 'Scared', 'Sleep', 'Fall', 'Wave']},
            {id: 'rayman-teensie', label: 'Teensie King', tags: ['Idle', 'Magic Cast', 'Teleport', 'Dance', 'Float', 'Bow', 'Hurt', 'Talk']},
            {id: 'rayman-hunter', label: 'Hunter', tags: ['Idle', 'Aim Gun', 'Shoot', 'Laugh', 'Surprised', 'Hit']},
            {id: 'rayman-mr-dark', label: 'Mr. Dark', tags: ['Cloak Spin', 'Cast Spell', 'Vanish', 'Laugh']}
        ]
    },
    {
        label: "Disney's Hercules",
        id: "game_herc",
        options: [
             {id: 'herc-hercules', label: 'Hercules', tags: ['Idle', 'Flex', 'Punch', 'Sword Slash', 'Power Punch', 'Drink Soda', 'Hurt', 'Pose']},
             {id: 'herc-phil', label: 'Phil (Satyr)', tags: ['Idle', 'Yell', 'Whistle', 'Run', 'Jump', 'Faint', 'Cheer', 'Point']},
             {id: 'herc-hades', label: 'Hades', tags: ['Idle', 'Fire Burst', 'Smoke Morph', 'Rage (Red)', 'Calm (Blue)', 'Throw Fireball', 'Laugh', 'Defeat']},
             {id: 'herc-hydra', label: 'Hydra Head', tags: ['Roar', 'Bite', 'Grow', 'Die']}
        ]
    },
    {
        label: "The Mask (SNES)",
        id: "game_mask",
        options: [
            {id: 'mask-mask', label: 'The Mask', tags: ['Idle', 'Sneak', 'Tornado Spin', 'Mallet Smash', 'Horn Blow', 'Cuban Pete Dance', 'Shocked', 'Guns']},
            {id: 'mask-milo', label: 'Milo (Dog)', tags: ['Idle', 'Bark', 'Jump Attack', 'Growl', 'Run', 'Dig', 'Pee', 'Scratch']},
            {id: 'mask-dorian', label: 'Dorian Tyrell', tags: ['Shoot', 'Laugh', 'Transformation', 'Hit']}
        ]
    },
    {
        label: "Prince of Persia",
        id: "game_pop",
        options: [
            {id: 'pop-classic', label: 'Prince (1989 Classic)', tags: ['Idle', 'Run', 'Careful Step', 'Jump (Running)', 'Climb Ledge', 'Sword Parry', 'Sword Strike', 'Drink Potion', 'Death (Spikes)']},
            {id: 'pop-jaffar', label: 'Jaffar / Guard (1989)', tags: ['Idle', 'Guard Stance', 'Advance', 'Retreat', 'Block', 'Strike', 'Hurt', 'Collapse']},
            {id: 'pop-shadow', label: 'The Shadow (Mirror)', tags: ['Idle', 'Mimic Move', 'Merge', 'Fade In', 'Fade Out', 'Sword Stance', 'Block', 'Dissolve']},
            {id: 'pop-sot', label: 'Prince (Sands of Time)', tags: ['Idle', 'Acrobatic Run', 'Wall Run', 'Dagger Stab', 'Time Rewind Pose', 'Freeze Enemy', 'Hurt', 'Sand Death']},
            {id: 'pop-dahaka', label: 'The Dahaka', tags: ['Idle (Smoke)', 'Chase', 'Tentacle Strike', 'Roar', 'Time Shift', 'Block', 'Stagger', 'Dissipate']}
        ]
    },
    {
        label: "Adventure Island",
        id: "game_adv",
        options: [
            {id: 'adv-higgins', label: 'Master Higgins', tags: ['Idle', 'Run', 'Jump', 'Throw Axe', 'Ride Skateboard', 'Trip/Rock', 'Burn', 'Egg Hatch']},
            {id: 'adv-tina', label: 'Tina', tags: ['Idle', 'Wave', 'Cry', 'Hug']},
            {id: 'adv-boss', label: 'Eggplant Boss', tags: ['Float', 'Shoot Fire', 'Laugh', 'Defeat']}
        ]
    },
    {
        label: "Bomberman",
        id: "game_bomb",
        options: [
            {id: 'bomb-white', label: 'White Bomber', tags: ['Idle', 'Walk', 'Place Bomb', 'Kick Bomb', 'Cheer', 'Shock', 'Burned', 'Die']},
            {id: 'bomb-black', label: 'Black Bomber', tags: ['Idle', 'Walk', 'Place Bomb', 'Taunt', 'Victory', 'Shock', 'Burned', 'Die']},
            {id: 'bomb-enemy', label: 'Ballom (Balloon)', tags: ['Float', 'Squish', 'Pop']}
        ]
    },
    {
        label: "Duck Hunt (NES)",
        id: "game_duck",
        options: [
            {id: 'duckhunt-dog', label: 'The Dog', tags: ['Sniff', 'Walk', 'Jump into Grass', 'Hold Duck', 'Laugh', 'Surprised', 'Hurt', 'Taunt']},
            {id: 'duckhunt-duck', label: 'The Duck', tags: ['Fly Horizontal', 'Fly Diagonal', 'Quack', 'Shot', 'Fall', 'Fly Away', 'Flap', 'Turn']}
        ]
    },
    {
        label: "Looney Tunes (Classic)",
        id: "game_lt",
        options: [
            {id: 'lt-bugs', label: 'Bugs Bunny', tags: ['Idle (Carrot)', 'Sneak', 'Walk', 'Jump', 'Throw Pie', 'Duck/Hide', 'Kiss', 'Sign Hold']},
            {id: 'lt-taz', label: 'Taz (Devil)', tags: ['Idle', 'Walk', 'Tornado Spin', 'Eat Object', 'Burp', 'Stop Spin', 'Dizzy', 'Roar']},
            {id: 'lt-daffy', label: 'Daffy Duck', tags: ['Idle', 'Rant', 'Jump', 'Beak Spin', 'Swim', 'Shocked', 'Complaint']},
            {id: 'lt-coyote', label: 'Wile E. Coyote', tags: ['Sneak', 'Hold Sign', 'Fall (Gravity)', 'Explosion Face', 'Run']}
        ]
    },
    {
        label: "Ice Age",
        id: "game_iceage",
        options: [
            {id: 'ia-sid', label: 'Sid the Sloth', tags: ['Idle (Clumsy)', 'Walk', 'Slide', 'Sleep', 'Hurt', 'Hug', 'Look for Nut', 'Fall']},
            {id: 'ia-manny', label: 'Manny (Mammoth)', tags: ['Idle', 'Walk (Heavy)', 'Trunk Swing', 'Stomp', 'Trumpet Sound', 'Gore', 'Defend', 'Collapse']},
            {id: 'ia-diego', label: 'Diego (Saber)', tags: ['Idle (Stalk)', 'Prowl', 'Sprint', 'Pounce', 'Claw Slash', 'Roar', 'Dodge', 'Wince']},
            {id: 'ia-scrat', label: 'Scrat (Squirrel)', tags: ['Idle (Sniff)', 'Scurry', 'Dig', 'Hold Nut', 'Scream', 'Flattened', 'Eye Twitch', 'Fall']},
            {id: 'ia-buck', label: 'Buck Wild', tags: ['Idle (Crazy)', 'Knife Pose', 'Spin Attack', 'Vine Swing', 'Dinosaur Ride', 'Salute', 'Hurt', 'Laugh']}
        ]
    },
    {
        label: "Racing & Cars",
        id: "game_racing",
        options: [
            {id: 'racing-nfs', label: 'NFS Sports Car', tags: ['Idle (Rev)', 'Drive', 'Turbo/Nitro', 'Drift Left', 'Drift Right', 'Jump', 'Crash', 'Wrecked']},
            {id: 'racing-mcqueen', label: 'Lightning McQueen', tags: ['Idle (Ka-Chow)', 'Drive', 'Wink', 'Stick Tongue', 'Drift', 'Tire Blowout', 'Sad', 'Win']},
            {id: 'racing-mini4wd', label: 'Magnum Saber (Mini 4WD)', tags: ['Idle', 'Speed', 'Cornering', 'Flip', 'Boost', 'Sparking', 'Crash', 'Pit Stop']},
            {id: 'racing-kart', label: 'Go-Kart', tags: ['Drive', 'Hop', 'Spin Out', 'Item Throw']}
        ]
    },
    {
      label: "Strategy (RTS / Iso)",
      id: "game_strat",
      options: [
        {id: 'strat-aoe', label: 'AoE Soldier', tags: ['Idle', 'Walk', 'Attack', 'Defend', 'Die', 'Decay']},
        {id: 'strat-coc', label: 'Clash Barbarian', tags: ['Idle (Bounce)', 'Run (Dash)', 'Attack', 'Guard', 'Hit', 'KO', 'Jump', 'Taunt']},
        {id: 'strat-stronghold', label: 'Crossbowman', tags: ['Load', 'Shoot', 'Walk', 'Die']},
        {id: 'strat-civ', label: 'Legion Unit', tags: ['March', 'Shield Wall', 'Stab', 'Throw Pilum', 'Cheer', 'Die', 'Fortify']}
      ]
    },

    // --- FIGHTING GAMES SEPARATED ---
    {
        label: "Street Fighter II Turbo (SNES)",
        id: "fight_sf2",
        options: [
            {id: 'sf2-ryu', label: 'Ryu', tags: ['Stance', 'Hadoken', 'Shoryuken', 'Tatsumaki', 'Block', 'KO']},
            {id: 'sf2-ken', label: 'Ken', tags: ['Stance', 'Shoryuken', 'Hadoken', 'Tatsumaki', 'Win']},
            {id: 'sf2-honda', label: 'E. Honda', tags: ['Stance', 'Hundred Hand Slap', 'Sumo Headbutt', 'Salt Throw', 'Win']},
            {id: 'sf2-chunli', label: 'Chun-Li', tags: ['Stance', 'Hyakuretsukyaku', 'Spinning Bird', 'Jump', 'Win']},
            {id: 'sf2-guile', label: 'Guile', tags: ['Stance', 'Sonic Boom', 'Flash Kick', 'Comb Hair', 'Win']},
            {id: 'sf2-blanka', label: 'Blanka', tags: ['Stance', 'Electric Shock', 'Rolling Attack', 'Bite', 'Roar']},
            {id: 'sf2-zangief', label: 'Zangief', tags: ['Stance', 'Spinning Piledriver', 'Lariat', 'Flex']},
            {id: 'sf2-dhalsim', label: 'Dhalsim', tags: ['Stance', 'Yoga Fire', 'Yoga Flame', 'Stretch Punch', 'Teleport']},
            {id: 'sf2-balrog', label: 'Balrog', tags: ['Stance', 'Dash Punch', 'Turn Punch', 'Headbutt', 'Win']},
            {id: 'sf2-vega', label: 'Vega', tags: ['Stance', 'Claw Dive', 'Backflip', 'Mask Off', 'Yodel']},
            {id: 'sf2-sagat', label: 'Sagat', tags: ['Stance', 'Tiger Shot', 'Tiger Uppercut', 'Laugh', 'Scar']},
            {id: 'sf2-bison', label: 'M. Bison', tags: ['Psycho Crusher', 'Head Stomp', 'Cape Float', 'Laugh']},
            {id: 'sf2-cammy', label: 'Cammy', tags: ['Stance', 'Cannon Drill', 'Spiral Arrow', 'Spinning Knuckle', 'Win']},
            {id: 'sf2-feilong', label: 'Fei Long', tags: ['Stance', 'Flame Kick', 'Chicken Wing', 'Pose']},
            {id: 'sf2-deejay', label: 'Dee Jay', tags: ['Stance', 'Maracas', 'Air Slasher', 'Kick']},
            {id: 'sf2-thawk', label: 'T. Hawk', tags: ['Stance', 'Condor Dive', 'Tomahawk Buster', 'Win']}
        ]
    },
    {
        label: "Mortal Kombat Trilogy (Classic)",
        id: "fight_mk",
        options: [
            {id: 'mk-scorpion', label: 'Scorpion', tags: ['Stance', 'Spear Throw', 'Teleport Punch', 'Toasty', 'Dizzy']},
            {id: 'mk-subzero', label: 'Sub-Zero', tags: ['Stance', 'Ice Freeze', 'Slide', 'Spine Rip', 'Dizzy']},
            {id: 'mk-raiden', label: 'Raiden', tags: ['Stance', 'Lightning', 'Torpedo Fly', 'Teleport', 'God Pose']},
            {id: 'mk-liukang', label: 'Liu Kang', tags: ['Stance', 'Fireball', 'Bicycle Kick', 'Dragon Morph', 'Win']},
            {id: 'mk-johnny', label: 'Johnny Cage', tags: ['Stance', 'Shadow Kick', 'Green Bolt', 'Nut Punch', 'Win']},
            {id: 'mk-sonya', label: 'Sonya Blade', tags: ['Stance', 'Ring Toss', 'Leg Grab', 'Kiss of Death']},
            {id: 'mk-kano', label: 'Kano', tags: ['Stance', 'Cannonball', 'Knife Throw', 'Heart Rip']},
            {id: 'mk-reptile', label: 'Reptile', tags: ['Stance', 'Acid Spit', 'Invisibility', 'Slide']},
            {id: 'mk-kitana', label: 'Kitana', tags: ['Stance', 'Fan Throw', 'Fan Lift', 'Kiss']},
            {id: 'mk-mileena', label: 'Mileena', tags: ['Stance', 'Sai Throw', 'Teleport Kick', 'Man Eater']},
            {id: 'mk-shang', label: 'Shang Tsung', tags: ['Stance', 'Morph', 'Soul Steal', 'Fireball']},
            {id: 'mk-goro', label: 'Goro', tags: ['Roar', 'Four Arm Grab', 'Stomp', 'Chest Pound']},
            {id: 'mk-shao', label: 'Shao Kahn', tags: ['Laugh', 'Hammer Smash', 'Shoulder Charge', 'Taunt']},
            {id: 'mk-motaro', label: 'Motaro', tags: ['Tail Laser', 'Teleport', 'Kick', 'Grab']}
        ]
    },
    {
        label: "Killer Instinct (SNES/N64)",
        id: "fight_ki",
        options: [
            {id: 'ki-jago', label: 'Jago', tags: ['Stance', 'Endokuken', 'Wind Kick', 'Ultra Combo', 'Win']},
            {id: 'ki-fulgore', label: 'Fulgore', tags: ['Stance', 'Laser Eye', 'Claw Uppercut', 'Teleport', 'Machine Die']},
            {id: 'ki-orchid', label: 'B. Orchid', tags: ['Stance', 'Fire Cat', 'Spinning Sword', 'Flasher']},
            {id: 'ki-glacius', label: 'Glacius', tags: ['Stance', 'Ice Lance', 'Liquid Morph', 'Puddle Uppercut']},
            {id: 'ki-cinder', label: 'Cinder', tags: ['Stance', 'Inferno', 'Trailblazer', 'Invisible']},
            {id: 'ki-spinal', label: 'Spinal', tags: ['Stance', 'Shield Charge', 'Teleport', 'Laugh']},
            {id: 'ki-saber', label: 'Sabrewulf', tags: ['Stance', 'Howl', 'Claw Spin', 'Bat']},
            {id: 'ki-riptor', label: 'Riptor', tags: ['Stance', 'Tail Whip', 'Fire Breath', 'Eat']},
            {id: 'ki-tj', label: 'T.J. Combo', tags: ['Stance', 'Rollercoaster', 'Powerline', 'Win']},
            {id: 'ki-chief', label: 'Chief Thunder', tags: ['Stance', 'Tomahawk', 'Phoenix', 'Rain']},
            {id: 'ki-eyedol', label: 'Eyedol (Boss)', tags: ['Stomp', 'Club Smash', 'Roar', 'Heal']},
            {id: 'ki-gargos', label: 'Gargos (Boss)', tags: ['Fly', 'Fireball', 'Laugh', 'Defeat']}
        ]
    },
    {
        label: "Tekken 3 (PS1)",
        id: "fight_t3",
        options: [
            {id: 't3-jin', label: 'Jin Kazama', tags: ['Stance', 'Electric God Fist', 'Hellsweep', 'Winning Pose']},
            {id: 't3-hwoarang', label: 'Hwoarang', tags: ['Stance', 'Flamingo Stance', 'Hunting Hawk', 'Kick Combo']},
            {id: 't3-lei', label: 'Lei Wulong', tags: ['Snake Stance', 'Drunken Master', 'Lay Down', 'Kick']},
            {id: 't3-yoshi', label: 'Yoshimitsu', tags: ['Sword Pogo', 'Helicopter', 'Meditate', 'Spin']},
            {id: 't3-eddy', label: 'Eddy Gordo', tags: ['Capoeira Stance', 'Handstand', 'Helicopter Kick', 'Dance']},
            {id: 't3-law', label: 'Forest Law', tags: ['Stance', 'Flip Kick', 'One Inch Punch', 'Wataa']},
            {id: 't3-paul', label: 'Paul Phoenix', tags: ['Stance', 'Deathfist', 'Falling Leaf', 'Brick Break']},
            {id: 't3-king', label: 'King', tags: ['Stance', 'Giant Swing', 'Chain Grab', 'Jaguar Roar']},
            {id: 't3-xiaoyu', label: 'Ling Xiaoyu', tags: ['Stance', 'Phoenix Stance', 'Roll', 'Wave']},
            {id: 't3-nina', label: 'Nina Williams', tags: ['Stance', 'Blonde Bomb', 'Arm Breaker', 'Slap']},
            {id: 't3-ogre', label: 'True Ogre', tags: ['Fly', 'Fire Breath', 'Snake Arm', 'Teleport']},
            {id: 't3-hei', label: 'Heihachi', tags: ['Stance', 'Electric', 'Headbutt', 'Laugh']},
            {id: 't3-gon', label: 'Gon', tags: ['Fart', 'Tail Spin', 'Fireball', 'Sleep']},
            {id: 't3-mokujin', label: 'Mokujin', tags: ['Mimic Stance', 'Wood Sound', 'Spin']}
        ]
    },
    {
        label: "Street Fighter Alpha 3 (PS1)",
        id: "fight_sfa3",
        options: [
            {id: 'sfa3-ryu', label: 'Ryu', tags: ['Stance', 'Hadoken', 'Shoryuken', 'Bandana']},
            {id: 'sfa3-sakura', label: 'Sakura', tags: ['Stance', 'Flower Kick', 'Sho-o-ken', 'Taunt']},
            {id: 'sfa3-akuma', label: 'Shin Akuma', tags: ['Air Fireball', 'Teleport', 'Raging Demon', 'Glow']},
            {id: 'sfa3-karin', label: 'Karin', tags: ['Stance', 'High Laugh', 'Ressen Ha', 'Counter']},
            {id: 'sfa3-cody', label: 'Cody', tags: ['Stance', 'Knife Throw', 'Rock Throw', 'Punch']},
            {id: 'sfa3-dan', label: 'Dan Hibiki', tags: ['Stance', 'Taunt', 'Gadoken', 'Cry']},
            {id: 'sfa3-rose', label: 'Rose', tags: ['Stance', 'Soul Spark', 'Scarf Reflect', 'Tarot']},
            {id: 'sfa3-bison', label: 'M. Bison (Alpha)', tags: ['Psycho Crusher', 'Teleport', 'Float', 'Cape']}
        ]
    },
    {
        label: "Marvel vs. Capcom 2 (Dreamcast)",
        id: "fight_mvc2",
        options: [
            {id: 'mvc2-ryu', label: 'Ryu', tags: ['Shinku Hadoken', 'Stance', 'Hurricane Kick', 'Beam']},
            {id: 'mvc2-wolvie', label: 'Wolverine', tags: ['Berserker Barrage', 'Drill Claw', 'Healing', 'Taunt']},
            {id: 'mvc2-spidey', label: 'Spider-Man', tags: ['Web Ball', 'Web Swing', 'Crawler Assault', 'Win']},
            {id: 'mvc2-venom', label: 'Venom', tags: ['Venom Fang', 'Web Throw', 'Symbiote Mass', 'Taunt']},
            {id: 'mvc2-cap', label: 'Captain America', tags: ['Shield Slash', 'Charging Star', 'Hyper Charging Star']},
            {id: 'mvc2-ironman', label: 'Iron Man', tags: ['Uni-Beam', 'Repulsor Blast', 'Proton Cannon', 'Fly']},
            {id: 'mvc2-hulk', label: 'Hulk', tags: ['Gamma Crush', 'Ground Wave', 'Roar', 'Smash']},
            {id: 'mvc2-cable', label: 'Cable', tags: ['Viper Beam', 'Grenade', 'Hyper Viper', 'Gun']},
            {id: 'mvc2-storm', label: 'Storm', tags: ['Typhoon', 'Lightning Storm', 'Fly', 'Float']},
            {id: 'mvc2-sentinel', label: 'Sentinel', tags: ['Rocket Punch', 'Fly', 'Drones', 'Stomp']},
            {id: 'mvc2-magneto', label: 'Magneto', tags: ['Magnetic Shockwave', 'Fly', 'EM Disruptor', 'Laugh']},
            {id: 'mvc2-morrigan', label: 'Morrigan', tags: ['Soul Fist', 'Shadow Blade', 'Darkness Illusion']}
        ]
    },
    {
        label: "Soulcalibur / Soul Blade",
        id: "fight_sc",
        options: [
            {id: 'sc-siegfried', label: 'Siegfried', tags: ['Heavy Sword', 'Stance', 'Slash', 'Kick', 'Ring Out']},
            {id: 'sc-nightmare', label: 'Nightmare', tags: ['Soul Edge Stance', 'Uppercut', 'Dark Aura', 'Laugh']},
            {id: 'sc-ivy', label: 'Ivy', tags: ['Whip Stance', 'Extend Whip', 'Grab', 'Pose']},
            {id: 'sc-mitsurugi', label: 'Mitsurugi', tags: ['Katana Stance', 'Slash', 'Sheath', 'Yell']},
            {id: 'sc-taki', label: 'Taki', tags: ['Ninja Flip', 'Smoke Bomb', 'Rapid Slash', 'Pose']},
            {id: 'sc-voldo', label: 'Voldo', tags: ['Crawl', 'Contortion', 'Claw Slash', 'Hiss']},
            {id: 'sc-astaroth', label: 'Astaroth', tags: ['Axe Swing', 'Headbutt', 'Throw', 'Roar']},
            {id: 'sc-cervantes', label: 'Cervantes', tags: ['Dual Swords', 'Pistol Shot', 'Teleport', 'Laugh']}
        ]
    },
    {
        label: "Street Fighter III: 3rd Strike",
        id: "fight_sf3",
        options: [
            {id: 'sf3-ryu', label: 'Ryu (SF3)', tags: ['Stance', 'Denjin Hadoken', 'Donkey Kick', 'Parry']},
            {id: 'sf3-chunli', label: 'Chun-Li', tags: ['Stance', 'Houyoku Sen', 'Parry', 'Taunt']},
            {id: 'sf3-ken', label: 'Ken', tags: ['Stance', 'Shippu Jinrai', 'Kick Rush', 'Taunt']},
            {id: 'sf3-akuma', label: 'Akuma', tags: ['Stance', 'Messatsu', 'Demon Flip', 'Pose']},
            {id: 'sf3-alex', label: 'Alex', tags: ['Stance', 'Power Bomb', 'Flash Chop', 'Bandana']},
            {id: 'sf3-dudley', label: 'Dudley', tags: ['Boxer Stance', 'Corkscrew Blow', 'Rose Throw', 'Duck']},
            {id: 'sf3-ibuki', label: 'Ibuki', tags: ['Ninja Run', 'Kunai', 'Neck Breaker', 'Win']},
            {id: 'sf3-makoto', label: 'Makoto', tags: ['Karate Stance', 'Seichusen Godanzuki', 'Choke', 'Yell']},
            {id: 'sf3-q', label: 'Q', tags: ['Walk', 'Dash Punch', 'Explosion', 'Mystery Pose']},
            {id: 'sf3-urien', label: 'Urien', tags: ['Aegis Reflector', 'Metallic Sphere', 'Suit Tear', 'Laugh']},
            {id: 'sf3-gill', label: 'Gill (Boss)', tags: ['Resurrection', 'Meteor', 'Seraphic Wing', 'Ice/Fire']}
        ]
    },
    {
        label: "Dead or Alive 2",
        id: "fight_doa",
        options: [
            {id: 'doa-kasumi', label: 'Kasumi', tags: ['Ninja Stance', 'Teleport', 'High Kick', 'Win']},
            {id: 'doa-ryu', label: 'Ryu Hayabusa', tags: ['Izuna Drop', 'Ninja Magic', 'Sword', 'Pose']},
            {id: 'doa-ayane', label: 'Ayane', tags: ['Spin Kick', 'Magic', 'Taunt', 'Win']},
            {id: 'doa-tina', label: 'Tina', tags: ['Wrestling Throw', 'Dropkick', 'Pose', 'Wave']},
            {id: 'doa-zack', label: 'Zack', tags: ['Muay Thai', 'Strange Pose', 'Win', 'Dance']}
        ]
    },
    {
        label: "Super Smash Bros (N64)",
        id: "fight_ssb",
        options: [
            {id: 'ssb-mario', label: 'Mario', tags: ['Idle', 'Fireball', 'Cape', 'Up B (Coin)', 'Taunt']},
            {id: 'ssb-link', label: 'Link', tags: ['Idle', 'Boomerang', 'Spin Attack', 'Bomb Pull', 'Shield']},
            {id: 'ssb-dk', label: 'Donkey Kong', tags: ['Idle', 'Ground Slap', 'Spin Punch', 'Carry', 'Taunt']},
            {id: 'ssb-samus', label: 'Samus', tags: ['Idle', 'Charge Shot', 'Screw Attack', 'Bomb', 'Morph Ball']},
            {id: 'ssb-fox', label: 'Fox', tags: ['Idle', 'Blaster', 'Reflector', 'Fire Fox', 'Taunt']},
            {id: 'ssb-pika', label: 'Pikachu', tags: ['Idle', 'Thunder', 'Quick Attack', 'Jolt', 'Taunt']},
            {id: 'ssb-kirby', label: 'Kirby', tags: ['Idle', 'Inhale', 'Fly', 'Stone', 'Cutter']},
            {id: 'ssb-yoshi', label: 'Yoshi', tags: ['Idle', 'Egg Throw', 'Flutter Jump', 'Tongue', 'Egg Lay']},
            {id: 'ssb-falcon', label: 'Captain Falcon', tags: ['Idle', 'Falcon Punch', 'Kick', 'Taunt (Salute)']},
            {id: 'ssb-ness', label: 'Ness', tags: ['Idle', 'PK Fire', 'PK Thunder', 'Bat', 'Yo-Yo']},
            {id: 'ssb-jiggly', label: 'Jigglypuff', tags: ['Idle', 'Sing', 'Rest', 'Pound', 'Float']},
            {id: 'ssb-hand', label: 'Master Hand', tags: ['Idle', 'Finger Gun', 'Slap', 'Punch', 'Die']}
        ]
    },
    {
        label: "TMNT: Tournament Fighters",
        id: "fight_tmnt",
        options: [
            {id: 'tmnt-tf-leo', label: 'Leonardo', tags: ['Stance', 'Katana Spin', 'Elbow Dash', 'Taunt']},
            {id: 'tmnt-tf-raph', label: 'Raphael', tags: ['Stance', 'Drill Attack', 'Bite', 'Taunt']},
            {id: 'tmnt-tf-don', label: 'Donatello', tags: ['Stance', 'Ground Wave', 'Staff Spin', 'Taunt']},
            {id: 'tmnt-tf-mike', label: 'Michelangelo', tags: ['Stance', 'Rising Thunder', 'Dynamite', 'Taunt']},
            {id: 'tmnt-tf-aska', label: 'Aska', tags: ['Stance', 'Spinning Uppercut', 'Butterfly', 'Win']},
            {id: 'tmnt-tf-chrome', label: 'Chrome Dome', tags: ['Stance', 'Laser', 'Extend Arm', 'Stomp']},
            {id: 'tmnt-tf-karai', label: 'Karai', tags: ['Stance', 'Explosion', 'Fast Kick', 'Laugh']}
        ]
    },
    {
        label: "Eternal Champions",
        id: "fight_ec",
        options: [
            {id: 'ec-shadow', label: 'Shadow', tags: ['Stance', 'Smoke Bomb', 'Fan Throw', 'Fatality']},
            {id: 'ec-xavier', label: 'Xavier', tags: ['Stance', 'Staff Spin', 'Magic Swap', 'Win']},
            {id: 'ec-trident', label: 'Trident', tags: ['Stance', 'Spinning Trident', 'Water Blast', 'Pose']},
            {id: 'ec-eternal', label: 'Eternal Champion', tags: ['Stance', 'Form Change', 'Laser', 'Defeat']}
        ]
    },
    {
        label: "Kung Fu / Yie Ar (NES)",
        id: "fight_nes_classic",
        options: [
            {id: 'nes-kungfu-thomas', label: 'Kung Fu Master (Thomas)', tags: ['Idle', 'Walk', 'Punch', 'Kick', 'Jump Kick', 'Crouch Kick', 'Hug Sylvia']},
            {id: 'nes-kungfu-x', label: 'Mr. X', tags: ['Laugh', 'Block', 'Counter', 'Defeat']},
            {id: 'nes-yiear-oolong', label: 'Oolong (Yie Ar)', tags: ['Idle', 'Jump', 'High Kick', 'Low Punch', 'Win Pose']},
            {id: 'nes-karate', label: 'Karate Champ', tags: ['Bow', 'Ready', 'Lunge', 'Roundhouse', 'Swept', 'Point']}
        ]
    }
  ];

  // Selection States
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [selectedCharId, setSelectedCharId] = useState(styleGroups[0].options[0].id);

  // Advanced States
  const [generationMode, setGenerationMode] = useState<GenerationMode>('strict');
  const [proportion, setProportion] = useState<ProportionMode>('heroic');
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('keep_original');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived Data
  const activeGame = styleGroups[activeGameIndex];
  // Ensure we fall back safely if switching games
  const activeCharacter = activeGame.options.find(c => c.id === selectedCharId) || activeGame.options[0];

  // Handlers
  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      setActiveGameIndex(idx);
      // Automatically select the first character of the new game
      setSelectedCharId(styleGroups[idx].options[0].id);
  };

  const handleGenerate = async () => {
      if(!image) return;

      // Ensure API key is selected for Veo video generation
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
      }
      
      setLoading(true); setError(null);
      try {
          const charIdToUse = activeCharacter.id; 
          const res = await generateInPlaceVideo(image, charIdToUse, generationMode, proportion, renderStyle, true);
          
          let modeLabel = 'Strict';
          if (generationMode === 'style') modeLabel = 'Adapter';
          if (generationMode === 'caricature') modeLabel = 'Caricature';

          addToHistory({ 
              resultVideo: res, 
              tabLabel: 'In-Place Video', 
              id: `sprite-${Date.now()}`, 
              timestamp: Date.now(), 
              inputs: { 
                  game: activeGame.label,
                  character: activeCharacter.label,
                  mode: modeLabel,
                  proportion: proportion,
                  render: renderStyle
              } 
          });
      } catch(e: any) { 
          setError(e.message); 
      }
      setLoading(false);
  };

  const handleClear = useCallback(() => {
    setImage(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
      <FeatureCard>
          <div className="flex justify-between items-start mb-2">
            <div>
                <h2 className="text-xl font-bold text-white">In-Place Videoation Sequence Maker</h2>
                <p className="text-gray-400 text-xs">
                    Generate sprites with accurate <strong>Game Physics & Animation States</strong>.
                </p>
            </div>
          </div>
          
          <ImageUploader image={image} onFileSelect={setImage} label="Reference Image (You)" />
          
          <div className="mt-4 space-y-6">
              
              {/* 1. GAME UNIVERSE SELECTION */}
              <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                  <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                      <span className="bg-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                      Select Game Universe
                  </h3>
                  <select 
                    value={activeGameIndex} 
                    onChange={handleGameChange} 
                    className="w-full bg-gray-800 border border-gray-500 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                  >
                      {styleGroups.map((group, index) => (
                          <option key={group.id} value={index}>{group.label}</option>
                      ))}
                  </select>
              </div>

              {/* 2. CHARACTER ROSTER SELECTION */}
              <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                   <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                      <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                      Select Character Model
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {activeGame.options.map((char) => (
                          <button
                            key={char.id}
                            onClick={() => setSelectedCharId(char.id)}
                            className={`p-2 text-xs sm:text-sm font-medium rounded-md transition-all border text-left flex flex-col justify-between h-14
                                ${selectedCharId === char.id 
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-[1.02]' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                }`
                            }
                          >
                              <span className="truncate w-full">{char.label}</span>
                              {selectedCharId === char.id && <span className="text-[9px] opacity-80">● Active</span>}
                          </button>
                      ))}
                  </div>
              </div>

              {/* 3. MOVESET PREVIEW */}
              <div className="bg-black/20 p-3 rounded border border-gray-700/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400 uppercase font-bold">Included Moves for: <span className="text-white">{activeCharacter.label}</span></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {activeCharacter.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] bg-gray-700 text-gray-200 px-2 py-1 rounded border border-gray-600 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${['bg-green-500','bg-blue-500','bg-purple-500','bg-red-500','bg-yellow-500'][i % 5]}`}></span>
                              {tag}
                          </span>
                      ))}
                  </div>
              </div>

              {/* 4. ADVANCED SETTINGS & RENDER STYLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  
                  {/* Identity Mode */}
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Identity Enforcement</label>
                      <div className="flex gap-1">
                          <button onClick={() => setGenerationMode('strict')} className={`flex-1 py-1 text-[10px] font-bold rounded border ${generationMode === 'strict' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              Strict
                          </button>
                          <button onClick={() => setGenerationMode('style')} className={`flex-1 py-1 text-[10px] font-bold rounded border ${generationMode === 'style' ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              Adapter
                          </button>
                          <button onClick={() => setGenerationMode('caricature')} className={`flex-1 py-1 text-[10px] font-bold rounded border ${generationMode === 'caricature' ? 'bg-orange-700 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              Caricature
                          </button>
                      </div>
                  </div>

                  {/* Render Style (RESTORED) */}
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Render Style (Graphics)</label>
                      <select 
                        value={renderStyle} 
                        onChange={(e) => setRenderStyle(e.target.value as RenderStyle)}
                        className="w-full bg-gray-800 border border-gray-600 text-white text-xs p-1.5 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      >
                          <option value="keep_original">Keep Original (No Filter)</option>
                          <option value="pixel_retro">Pixel Art (8-bit / 16-bit)</option>
                          <option value="modern_2d">Modern 2D (HD Vector)</option>
                          <option value="ps1_retro">PS1 Retro (Low Poly)</option>
                          <option value="ps4_modern">Modern 3D (High Fidelity)</option>
                          <option value="hand_drawn">Hand Drawn (Sketchy)</option>
                          <option value="retro_pixar">Retro 3D (Pre-rendered)</option>
                      </select>
                  </div>

                  {/* Proportions */}
                  <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Body Proportions</label>
                      <div className="flex gap-1">
                          {(['realistic', 'heroic', 'chibi'] as const).map(p => (
                              <button 
                                key={p} 
                                onClick={() => setProportion(p)} 
                                className={`flex-1 py-1 px-1 text-[10px] font-bold rounded border capitalize ${proportion === p ? 'bg-gray-600 border-gray-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                              >
                                  {p}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {error && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}
          
          <div className="flex items-center gap-4 mt-6">
            <button onClick={handleGenerate} disabled={loading || !image} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30 transition-all">
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Generating {activeCharacter.label}...
                    </span>
                ) : `Generate ${activeCharacter.label} Animation`}
            </button>
            <button
              onClick={handleClear}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
              aria-label="Clear inputs"
              disabled={loading}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
      </FeatureCard>
  );
};

export default InPlaceVideoMaker;
