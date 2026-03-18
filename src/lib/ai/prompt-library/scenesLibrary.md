# Scene Library — Escenas Completas para Generación de Imágenes
---

## Instrucciones para la IA de copy

### ¿Qué es este archivo?
Una biblioteca de **prompts de escena** para generación de imágenes realistas en Gemini y modelos similares. Cada prompt describe una escena completa: persona, acción, producto, luz, fondo y atmósfera.

### Cómo buscar en este archivo
1. **Identificá la categoría** del producto (ej: `Belleza & Cosmética`, `Fitness`, `Mascotas`)
2. **Identificá el ángulo** que mejor se alinea con el objetivo del creativo (ej: `emocional`, `problema`, `aspiracional`)
3. **Tomá el prompt correspondiente** como base y adaptá los elementos entre corchetes `[ ]`
4. **Siempre conservá** la instrucción final: *"Subject and product on right side only. Left half must remain completely clean for pre-rendered text."*

### Campos que debe devolver la IA
Cuando uses esta biblioteca para generar un creativo, el output debe incluir:

```json
{
  "category": "Belleza & Cosmética",
  "angle": "emocional — ritual de autocuidado",
  "scenePrompt": "< prompt completo adaptado al producto >",
  "lightingKeywords": ["soft diffused", "golden hour", "warm neutrals"],
  "colorPalette": ["cream", "warm beige", "soft gold"],
  "shotSpec": "50mm, shallow depth of field, bokeh"
}
```

### Reglas de adaptación
- **Reemplazá** referencias genéricas de producto por el nombre o tipo real
- **Ajustá la edad** de la persona al target del producto
- **Mantené** siempre la instrucción de composición al final (zona limpia izquierda)
- **No combines** más de un ángulo por prompt — cada ángulo tiene un objetivo comunicacional distinto
- Si ningún prompt encaja exactamente, usá la **Guía de tonos** al final del archivo para construir uno nuevo

### Tabla de ángulos disponibles por categoría

| Ángulo | Objetivo comunicacional | Categorías donde aplica |
|--------|------------------------|------------------------|
| Emocional / ritual | Conexión, pertenencia, autocuidado | Belleza, Salud, Hogar, Bebés |
| Problema | Identificación del dolor, contraste | Todas |
| Aspiracional | Resultado logrado, confianza | Belleza, Fitness, Moda, Joyería |
| Urgencia / decisión | CTA directa, comparación | Todas |
| Transformación | Antes/después implícito | Belleza, Salud, Fitness, Educación |
| Vulnerabilidad | Autenticidad, piel honesta | Belleza, Salud, Maternidad |
| Nocturno | Ritual de noche, calma | Belleza, Salud, Hogar |
| Ciencia / técnico | Credibilidad, ingredientes | Belleza, Salud, Fitness, Tech |
| Social proof | Recomendación, boca a boca | Todas |
| Aventura / outdoor | Energía, libertad, movimiento | Fitness, Mascotas, Automotriz |
| Familiar / doméstico | Calidez, pertenencia, confianza | Alimentos, Mascotas, Bebés, Hogar |
| Premium / gourmet | Estatus, exclusividad | Alimentos, Joyería, Moda |
| Hygge / calidez invernal | Refugio, comfort, calma | Hogar, Alimentos, Salud |

---

## Belleza & Cosmética
*Prompts hiperrealistas para imágenes generadas por IA — Gemini*

---

### 🪞 Ángulo emocional — ritual de autocuidado

A real woman, late 30s, Croatian or Southern European features — defined jaw, slightly drooping upper eyelids, natural asymmetry. Skin shows visible open pores across the nose, two faint smile lines from nostril to lip corner, one barely perceptible acne scar on left cheek, no concealer. Hair dark brown, naturally wavy, slightly frizzy at the temples from humidity. She sits on the cold edge of a white Carrara marble bathtub, bare feet resting on warm hexagonal floor tiles, toenails unpainted. Wearing an oversized cream linen shirt, slightly wrinkled, one shoulder slipping down. Warm golden hour light streams through a frosted privacy window behind her — the sun is low, backlight diffusing softly through the frosted glass, creating a rim halo around her hair but leaving her face in warm ambient shadow. She holds the product in her right hand at chest height, her wrist slightly bent, applying a single drop of serum to the inside of her left wrist using her ring finger — the way women actually apply fragrance. The product bottle has a small smudge near the cap from previous use. On the counter: one unscented white pillar candle half-burned with wax drips solidified on the side, a folded white cotton towel slightly damp at one edge, and a small pothos plant in a terracotta pot. The bathroom mirror in the far background reflects a blurred version of her profile. Calm, intimate, unhurried. Shot on Sony A7R V with 35mm Zeiss Batis, f/1.8, golden hour warm grade, slight skin texture pass in post. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 😩 Ángulo problema — piel que necesita ayuda

A tired woman, early 30s, Eastern European features — pale skin, freckles across the nose, light blue-green eyes with visible capillaries from lack of sleep. Deep purple-blue undereye circles with slight puffiness — not dramatically exaggerated, but unmistakably real. Uneven skin tone: slightly redder across the cheeks and chin. Her dark blonde hair is loosely pulled back in a claw clip, several strands falling at the temples. She stands in a bright modern bathroom, a large window to her left flooding harsh morning light — the kind of light that reveals everything. She holds the product bottle near her cheekbone, label toward camera, looking at it with an expression that reads between hope and exhaustion: brows slightly raised, lips pressed together. Her other hand touches her cheek, fingertips pressing lightly into skin that indents slightly. Behind her, the counter is genuinely cluttered: 8–10 products — serums, toners, a cleanser with the pump tilted, one jar open, a sheet mask packet half-torn, a cotton pad with residue still on it, two products slightly overlapping. A glass of unfinished water. The chaos of someone who has tried everything. Shot on Canon R5, 50mm, f/2.0, raw morning light, no fill, natural shadows. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### ✨ Ángulo aspiracional — resultado logrado

A radiant woman, early 40s, Colombian or Peruvian features — warm olive skin, naturally thick dark eyebrows, deep-set brown eyes with visible crow's feet that read as attractive and earned. Her skin genuinely glows — not oily, but plump and hydrated, the kind that reflects light softly. No makeup except maybe a very light brow grooming. She sits at a low modern vanity desk in a bedroom, morning sun entering through sheer linen curtains, casting soft diffused light that wraps around her face. She casually holds the product at her side — not posed, as if she just set it down a second ago. She looks directly into camera with the expression of someone who has nothing to prove: relaxed jaw, slight natural smile, weight back in the chair. The vanity surface has the product, a small round mirror tilted at an angle, the light catching its edge, and one stem of white ranunculus in a small clear bud vase. She wears a sage green fine-knit top, collar slightly loose at the neck. Shot on Fujifilm GFX 100S, 63mm equivalent, f/2.8, warm editorial grade, slight highlight roll-off. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🛒 Ángulo urgencia — descubrimiento directo

A confident woman, early 30s, Brazilian or Mexican features — rich medium-brown skin, strong nose, naturally full lips, dark eyes with long natural lashes and faint hyperpigmentation above the upper lip. She stands in a bright beauty retail aisle, the kind with fluorescent overhead lighting mixed with warm display spotlights. Both walls of the aisle are lined with competing product shelves, all intentionally soft-focus — you can read shapes and colors but not logos. She holds this product extended toward camera at arm's length with her right hand, label perfectly facing viewer, arm slightly bent at the elbow. Her left hand points at it with one finger — index finger extended, a gesture that says "this one, stop." Her expression is direct, unsmiling, with a slight raise of one eyebrow. She wears a camel-colored fitted blazer over a white fitted tee, small gold hoops. Her hair is natural 4B coils, full volume, pulled back loosely. The lighting is clean commercial — crisp shadows under the chin and pointing hand, slightly cooler white tones. Shot on Nikon Z9, 35mm, f/2.0, commercial editorial grade, slightly desaturated background. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### ☀️ Ángulo transformación — integración diaria

A woman, mid-30s, Northern Italian or French features — light olive skin, hazel eyes, faint dark circles still visible under one eye (realistic, not corrected), light brown hair in a low bun with several pieces falling loose around her face. She sits at a sunlit breakfast table in a modern kitchen — white plaster walls, light oak table, black matte cabinet handles visible in background. Morning light enters from a large window to her left, golden and direct, making the steam from her coffee cup faintly visible. She holds the product on the table with her right hand, fingers wrapped around it naturally — the way you'd hold something you've already incorporated into your morning. Her left hand cradles her own jaw, fingers lightly pressing into smooth skin, expression quiet and content: a woman who isn't performing for anyone. On the table: a ceramic mug with a visible ring stain on the saucer from a previous use, a folded oatmeal-colored linen napkin slightly creased, one slice of sourdough toast with butter half-melted, a small glass of water. Shot on Sony A7IV, 40mm, f/2.2, warm morning grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🪟 Ángulo vulnerabilidad — piel honesta bajo luz natural

A woman, late 30s, Northern European features — fair skin with visible redness across the cheeks and nose (mild rosacea), visible pores, two distinct moles on the neck, fine lines at the outer corners of both eyes, a small raised bump near the hairline. Zero makeup — not even concealer. She stands near a large window, harsh midday light cutting directly across one side of her face — the left half is in bright, unflattering light, the right in natural shadow. The asymmetry of her face is visible and human. Her hair is unstyled, slightly flat from sleep, pulled back with a thin elastic. She holds the product close to her chest with both hands, fingers overlapping — the protective gesture of someone presenting something vulnerable, or receiving comfort. Her eyes look directly into camera. Not smiling. Not performing. The room behind her: a neutral warm-white wall, a single framed art print slightly out of focus, white cotton curtains with a faint texture catching the breeze. Shot on Leica SL2, 50mm APO-Summicron, f/2.0, documentary neutral grade, no skin retouching, full texture pass preserved. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🌙 Ángulo nocturno — rutina de noche

A peaceful woman, late 20s, Japanese or Korean features — monolid eyes slightly heavy from fatigue, visible fine dry skin on the lower cheeks, pink undertone. She sits at a small vanity in a dimly lit bedroom, the only light from a warm Edison bulb lamp to her left and three small tea light candles reflected in the round mirror in front of her — you can count the tiny flame reflections in the glass. She wears a dusty rose silk robe with a slight wrinkle across the lap, and her hair is wrapped in a white terry towel twisted at the crown, slightly uneven. She holds the night cream jar in her open left palm — the jar lid is off, resting next to it. Her right fingertips press gently into the surface of the cream, mid-scoop, knuckles slightly bent. Her reflection in the mirror shows her eyes closed, lips slightly parted, the expression of someone fully present and quiet. On the vanity surface: a contact lens case open with solution visible, a half-full glass of water with a slight condensation ring underneath, a white analog clock reading exactly 10:07pm. Warm amber, deep ivory, and muted mauve tones. Shot on Sony A7III, 50mm, f/1.4, very shallow depth of field, amber gel on practical light source. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🔬 Ángulo ciencia — ingredientes que funcionan

A sharp woman, early 30s, Indian features — warm medium-brown skin, sharp dark eyes behind minimal wire-frame glasses, high cheekbones, natural eyebrows slightly overgrown at the inner corners. She stands in a bright clinical space — white walls, no art, clean white shelving with a few laboratory-style amber bottles partially in frame. A large LED ring-light magnifying mirror is mounted on the wall to her right, turned on, creating a circular catchlight reflected in her glasses. She holds the serum bottle up at eye level with her right hand, tilting it slightly forward — the liquid inside shifts, catching the light, showing viscosity. Her left hand holds a small white card — not fully legible, but you can see it's printed text with ingredient names. She wears a clean white Oxford shirt, top button open, hair pulled back in a tight low bun, one strand loose behind the ear. Her expression is focused, analytical — slightly narrowed eyes, head tilted a few degrees. Cool clinical tones — white, light grey, soft blue undertones. Shot on Phase One, 40mm, f/4.0, product photography strobe lighting softened with large diffusion panels. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 👥 Ángulo social proof — compartir el secreto

Two women, early and mid 30s, sitting together on a sunlit terrace in Southern Europe. Woman A: Moroccan or Algerian features, warm tan skin, natural curly dark hair loose and slightly blown by breeze, small gold nose stud. Woman B: Spanish or Portuguese, lighter olive skin, straight dark hair with natural highlights, small sun freckles across the nose. Both wearing casual earth-tone clothing — linen, loose fits, flats. Woman A holds the product, showing it to Woman B with genuine enthusiasm — arm slightly extended, label toward her friend, one eyebrow raised, a half-smile saying "I know, I know." Woman B leans forward over the small round table, fingertips pressed to her own cheekbone, expression of genuine curiosity and recognition — like she's realizing something. Between them on the table: two white espresso cups, both empty with a slight coffee ring inside, a pair of tortoiseshell sunglasses folded, a small olive branch in a thin-necked ceramic vase. The overhead structure has irregular wooden beams with climbing vine shadows casting dappled, moving light patterns on the table and their arms. Warm Mediterranean tones — terracotta, dusty olive, warm golden light. Shot on Leica M11, 35mm Summilux, f/2.0, candid documentary style, natural afternoon light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🤍 Ángulo minimalismo — menos es más

A composed woman, mid-40s, Scandinavian features — pale skin, naturally white-blonde hair just below the ears, small light eyes with deep-set hooded lids, a slight softness at the jawline that reads as dignified. She stands in a completely bare room — the walls are warm white with a very subtle plaster texture, not flat painted. A single beam of natural daylight enters from a narrow window off frame left, raking at 45 degrees, casting a long soft shadow of her body across the floor to the right. She holds the product in both open upturned palms — a gesture more offering than holding, arms slightly extended from the body, elbows soft. Her expression is completely still: not happy, not sad, simply certain. She wears a white linen shirt loosely tucked into off-white wide-leg trousers, fabric slightly wrinkled at the hip. No jewelry, no accessories, no other objects in frame. The product is the only element with color in the entire frame. Shot on Hasselblad X2D, 90mm, f/2.8, ultra-shallow depth of field, natural daylight only, high-contrast negative space. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 👩‍👧 Ángulo generacional — la rutina heredada

A woman, early 50s, and her daughter, mid-20s, standing side by side at a shared bathroom mirror. The mother: Mediterranean features, silver hair mixed with dark at the root, visible nasolabial folds and slight jowling that reads as beautiful and natural, warm amber-brown eyes. The daughter: clearly resembles her mother in bone structure but younger — same eye shape, same nose bridge, fuller skin. Both wear soft morning robes, slightly different — the mother's is a worn ivory terry cloth with a faded monogram, the daughter's is newer pale pink cotton. Natural window light from the left illuminates both faces at a slight angle. The mother applies the product to her own face with practiced, automatic ease — her technique is specific: three fingers dragging upward along the cheekbone. The daughter watches her and mirrors the gesture almost simultaneously, slightly hesitant, learning. In the mirror, both reflections are visible — you can see generations side by side twice. Neither woman looks at camera. The intimacy is total. Shot on Canon R5, 50mm, f/2.5, warm intimate grade, slight lens diffusion. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🤲 Ángulo sensorial — textura y placer táctil

Extreme close-up: a woman's hand mid-application — ring finger and middle finger pressing a generous amount of rich face cream into the side of her jaw, just below the cheekbone. The cream is slightly off-white with a luminous sheen, catching warm side light from camera-right — you can see the texture change as pressure is applied, the product moving between skin ridges. Her skin is real: fine horizontal lines on the neck visible just below frame, pores clearly visible on the cheek, slight redness from the pressure of touch, one small raised bump near the hairline. The fingernails are cut short, completely unpolished, with a slight cuticle that hasn't been pushed back. Her skin has a natural warmth — not tanned, slightly flushed. The product jar rests on white Carrara marble to her right, lid open, a small residue of cream on the outer rim where the lid was replaced without wiping. The marble has natural grey veining. The background is entirely blurred warm cream tone — a wall or linen fabric, indeterminate. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto D2 monoblock with 1x3 strip softbox from camera-right, slight product photography grade with warm skin pass. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

*Prompts optimizados para Gemini Imagen — énfasis en hiperrealismo humano, gestualidad auténtica y referencia técnica fotográfica.*

---

## Salud & Bienestar
*Suplementos, vitaminas, colágeno, detox, wellness*

---

### Ángulo vitalidad — energía matutina
A vibrant woman in her late 30s, bright eyes, natural glow, hair in a casual twist. She stands in a modern open kitchen at dawn, golden first light through floor-to-ceiling windows. She holds the supplement bottle in one hand while pouring a glass of water with the other, mid-motion. Relaxed linen outfit in muted tones. Kitchen counter has cutting board with fruit, green smoothie, and one plant. Radiates "morning ritual." Warm golden tones, soft shadows. Shot at 35mm, lifestyle editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo confianza — recomendación genuina
A relatable woman in her 40s sits on a light sofa in a cozy modern living room, afternoon light from a side window creating soft directional shadows. She holds the supplement bottle at chest height with both hands, warm genuine smile — sharing a discovery. Soft knit sweater in dusty rose. Bookshelves, throw blanket, tea on side table behind her. Domestic, warm, trustworthy. Neutral warm tones — blush, cream, light wood. Shot at 50mm, shallow depth of field, natural light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo transformación — versión mejorada de una misma
A confident woman in her 40s, well-groomed but natural, standing in a bright yoga space — light wood floor, large window, rolled yoga mat nearby. She holds the product casually at her side while standing tall with excellent posture. Expression: composed pride, quiet certainty. Smart athleisure in muted olive or navy. Minimal space: single plant, meditation cushion, clean lines. Communicates inner and outer alignment. Soft neutral tones. Shot at 40mm, editorial wellness. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo problema — agotamiento invisible
A tired woman in her late 30s sits at a messy home office desk, late afternoon shadows. Laptop open, papers, empty coffee cups, half-eaten snack. She rubs her temple with one hand while the other rests next to the supplement bottle — positioned as the answer. Eyes slightly glazed, shoulders hunched, running on empty. Comfortable but wrinkled top. Tells the story of invisible burnout. Moody warm tones, slightly desaturated. Shot at 35mm, documentary style. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo natural — conexión con lo orgánico
A calm woman in her early 30s stands in a sunlit greenhouse or garden room, surrounded by green plants at various heights. She holds the wellness product in one hand, the other hand gently touching a leaf of a nearby plant. Wearing a natural linen dress, barefoot on stone tiles. Sun filters through glass ceiling creating dramatic light beams and plant shadows on her skin. Expression is peaceful, grounded. The product feels like it belongs among the greenery. Rich green tones with warm golden light accents. Shot at 35mm, botanical editorial style. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo nocturno — descanso reparador
A serene woman in her 40s sits propped up in bed, bedside lamp casting a warm amber pool of light. She holds the supplement capsule between two fingers, about to take it with the glass of water on her nightstand. She wears simple cotton pajamas. The bedroom is dark and peaceful — only the lamp and the faint blue of a window showing twilight. A book is face-down on the covers, reading glasses beside it. The scene captures the commitment to self-care even at the end of a long day. Warm amber against deep blue-grey darkness. Shot at 50mm, intimate, very soft focus edges. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo médico — respaldo profesional *(nuevo)*
A woman in her early 40s sits across a well-lit consultation desk. A healthcare professional (partially visible, blurred) gestures toward a printed chart while the woman holds the product, nodding with relief and clarity. Clean, bright clinical environment — white walls, a potted plant, natural light from a side window softening the space. The woman's expression is "finally, someone explained it properly." She wears casual smart clothing. Warm neutral tones with clinical whites. Shot at 50mm, documentary, shallow depth on the patient. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo constancia — el hábito que se mantiene *(nuevo)*
A woman in her 30s stands at her kitchen counter in the early morning, still in pajamas, hair slightly disheveled. She's already mid-routine — product open, a glass of water half-drunk beside it. Expression is calm and automatic: this is just what she does. A simple wall calendar behind her has small checkmarks on consecutive days. Warm tungsten kitchen light, pre-dawn atmosphere. The scene communicates "this is no longer a challenge — it's just life." Warm amber and cream tones. Shot at 40mm, candid lifestyle. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Fitness & Deporte
*Proteínas, pre-workout, suplementos deportivos, equipamiento*

---

### Ángulo performance — antes del entrenamiento
A fit woman in her early 30s, hair in high ponytail, minimalist athletic wear in black and dark teal. She stands in a raw industrial gym — exposed brick, metal equipment, natural light from high windows. She holds the protein container at waist level, scooping powder into a shaker with focused determination. Jaw set, eyes forward, coiled with pre-workout energy. Barbell rack and weight plates visible behind, blurred. Gritty, serious, no-nonsense. Cool industrial tones — charcoal, concrete grey, teal. Shot at 35mm, dramatic side lighting. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo post-entrenamiento — recompensa merecida
A strong woman in her late 20s, post-workout glow, light sheen of sweat. She sits on a wooden bench in a clean modern gym, towel draped over shoulder, shaker bottle raised in a casual toast. Behind her, empty gym bathed in warm late-afternoon light through large windows. Satisfied, accomplished expression — genuine smile of someone who showed up. Athletic wear in deep burgundy or navy. Warm golden tones, cinematic light. Shot at 50mm, shallow depth of field, bokeh on equipment. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo motivacional — determinación pura
An athletic man in his 30s, muscular but lean, stands in an outdoor training area at sunrise — pull-up bars, concrete, raw urban backdrop with warm early light painting long shadows. He holds the product confidently at chest height with one hand, other arm hanging naturally. Strong planted stance, direct eye contact. Expression: fierce calm, quietly certain. Simple dark training gear. Sunrise behind creates rim lighting on shoulders and arms. Warm-cool contrast — golden light against cool concrete. Shot at 35mm, dramatic. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo problema — estancamiento físico
A frustrated athlete in their 30s sits on the floor of a dimly lit gym, back against a wall, legs extended, staring at the ceiling. A nearly empty, old supplement container sits beside them — clearly the wrong product. Hands on knees, showing frustration. Gym equipment looms in background, unused. Harsh overhead fluorescent creating unflattering shadows. Monochromatic cool tones — grey, steel blue, concrete. Moody and honest. Shot at 35mm, documentary style. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo outdoor — naturaleza como gimnasio
A toned woman in her late 20s stands on a rocky trail at golden hour, mountains or hills softly blurred behind her. She takes a sip from her shaker bottle after a trail run, one hand on her hip, catching her breath with a look of exhilaration. Windblown ponytail, trail running shoes, compression leggings with dust. The landscape is vast and dramatic behind her. The product is her reward for conquering nature. Rich warm light, earth tones — dusty orange, sage, granite grey. Shot at 35mm, adventure editorial, lens flare from sun. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo lifestyle — fitness integrado
A fit couple in their 30s in a bright modern kitchen, post-workout. He leans against the counter while she prepares two shaker bottles with the product. Both in athletic wear, relaxed and smiling. The kitchen has a fruit bowl, a yoga mat rolled in the corner, sneakers by the door. Natural morning light floods through windows. The scene shows fitness as a shared lifestyle, not a chore. Warm, domestic, aspirational. Honey and cream tones with pops of athletic color. Shot at 40mm, lifestyle editorial, candid feel. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo recuperación — el día después *(nuevo)*
A fit man in his 30s sits on the edge of his bed in the morning, still sore but calm. He wears compression shorts and a simple tee. He holds the recovery product in both hands, reading the label with focused attention. Through a window behind him, early light reveals a pair of running shoes and a foam roller on the floor. The bedroom is simple and functional — no clutter. Expression: disciplined, long-term thinker. Soft morning light, cool neutrals. Shot at 50mm, intimate editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo comunidad — entrenar juntos *(nuevo)*
Three women in their late 20s–30s stand outside a gym after a group class, all flushed and energized. One holds the product, showing the label to the others who lean in curiously. They're all sweaty, hair disheveled, laughing — the authentic post-workout glow. The gym exterior is visible behind: a glass door, a signboard, morning sky. The scene captures the social energy of shared fitness. Bright outdoor light, athletic wear in complementary earth tones. Shot at 35mm, candid, group documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Alimentos & Bebidas
*Snacks, bebidas saludables, infusiones, proteínas, superfoods*

---

### Ángulo placer — disfrute genuino en la cocina
A warm woman in her early 30s stands at a bright modern kitchen island, golden morning light through wide windows. She holds the food product in one hand while reaching for a fresh ingredient — mid-preparation. Wooden cutting board with sliced avocado, colorful vegetables, linen napkin. Relaxed apron over casual white tee, genuinely smiling — not at camera, but at what she's making. Radiates conscious eating. Warm earthy tones — terracotta, olive, natural wood, pops of green. Shot at 40mm, lifestyle editorial, natural light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo lifestyle — momento cotidiano
A relaxed woman in her 30s sits at a small round café table by a window, afternoon sun creating warm intimate atmosphere. She holds the beverage naturally — mid-sip or just lowered from lips. Other hand rests on an open book. Casual weekend clothes — soft cardigan over simple top. Blurred café behind: pendant lights, brick, other patrons. "Me time." Muted warm tones — caramel, cream, soft amber. Shot at 50mm, salon-style bokeh. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo energético — fuel para el día
A bright, energetic woman in her late 20s walks through a sun-drenched farmers market, product in one hand, tote bag slung over shoulder. Mid-stride, caught candidly, laughing. Market stalls behind with colorful produce, flowers, textiles — soft focus. Patterned top, rolled jeans, sneakers. Bursts with color, movement, vitality. Saturated warm tones — sunflower, terracotta, leafy green, dappled sunlight. Shot at 35mm, handheld feel, dynamic composition. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo problema — alimentación sin sentido
A tired person sits at a cluttered kitchen table under flat unflattering overhead light. Fast food containers, crumpled napkins, soda can surround them. Staring at phone scrolling mindlessly while eating. Slumped posture, blank expression. The healthy product sits unopened on the counter behind — visible but not yet chosen. Contrast between chaos on table and clean product tells the story. Desaturated, slightly cold tones. Shot at 35mm, documentary honest. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo familiar — mesa compartida
A family scene at a bright dining table — a parent in their 30s pours or serves the product while a child watches with curiosity. Warm mid-morning light streams from a side window. The table has colorful plates, a fruit bowl, and a loaf of bread. The parent looks at the child with a warm smile while presenting the product naturally. The home is modern but lived-in — artwork on the wall, a high chair, toys visible in the background. Warm, nurturing tones — buttercream, soft wood, terracotta. Shot at 35mm, lifestyle, slightly elevated angle. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo premium — experiencia gourmet
A sophisticated person in their 30s stands at a sleek marble kitchen counter, the product artfully placed alongside premium ingredients — truffle oil, fresh herbs, a beautiful cutting board. They hold a tasting spoon, mid-preparation of something elevated. Wearing a dark apron over a simple black tee. Kitchen is modern and minimal — pendant lights, matte black fixtures, copper accents. The scene elevates the product to gourmet status. Rich, moody tones — charcoal, warm copper, deep green herbs. Dramatic side lighting from a window. Shot at 50mm, food editorial, shallow depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo ritual matutino — el primer sorbo *(nuevo)*
A woman in her early 30s stands barefoot on a warm-toned kitchen floor in the first minutes of the morning. Hair undone, oversized linen shirt, eyes still soft with sleep. She cradles the product — a beverage or infusion — with both hands, first sip mid-way. Steam rises visibly. The window behind her shows pre-dawn blue light slowly becoming golden. No phone, no noise. Just this. Communicates the sacredness of the morning ritual. Deep blue to warm gold gradient atmosphere. Shot at 35mm, intimate documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo post-ejercicio — recarga inteligente *(nuevo)*
A woman in her late 20s sits on the front steps of her building after a run, hair in a loose bun, earbuds hanging around her neck. She opens the product — a healthy drink or snack — with the ease of habit. Running shoes dusty, legs slightly sore. She looks down the quiet street while taking the first bite or sip, expression of quiet satisfaction. Morning light just hitting the pavement. Urban, real, everyday hero. Warm urban morning tones — concrete, gold, sky blue. Shot at 35mm, candid street editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Tecnología (electrónica, gadgets, software, apps)
*Prompts hiperrealistas para imágenes generadas por IA — Gemini*

---

### 💆 Ángulo emocional — el dispositivo que acompaña

A calm man, mid-30s, Northern European features — light brown hair slightly disheveled, pale skin with faint stubble, small bags under grey-blue eyes that read as lived-in rather than exhausted. He sits on the edge of an unmade bed, early morning, feet bare on a warm wood floor. He wears a faded olive crewneck and light grey sweatpants. His left wrist rests on his knee, a smartwatch clasped naturally — not presented to camera, just worn. He looks down at it with the quiet expression of someone checking in with themselves: brows soft, lips relaxed, the way you look at something that has become part of your body. The room is dim, the only light a warm diffused glow from a bedside lamp to his left and a sliver of grey-blue dawn coming through a narrow gap in linen curtains. On the nightstand: a half-empty glass of water, a paperback face-down, the charging cable with the watch's small magnetic puck resting beside it — unplugged, because the watch is on his wrist. Shot on Sony A7R V, 35mm, f/1.8, warm amber pre-dawn grade, minimal fill. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 😤 Ángulo problema — el caos sin solución

A frustrated woman, early 30s, Brazilian features — warm medium-brown skin, dark eyes slightly narrowed, thick dark hair pulled into a messy bun with several strands escaping. She sits at a cluttered home office desk, harsh overhead LED ceiling light, no natural light. Her expression reads between exasperation and resignation: jaw slightly tense, one hand pressed flat on the desk, the other holding her phone at an awkward angle trying to get signal or load something — the screen visible but blurred. The desk is genuinely chaotic: two different charging cables tangled together, a laptop with three browser tabs open and a loading spinner visible on one, a dead wireless mouse with a fresh AA battery sitting next to it still in its packaging, a half-eaten granola bar on a crumpled wrapper, a sticky note with a password written on it half-peeled off the monitor. A second phone — older, screen cracked — rests screen-down near the edge. She holds the product with her free hand — a compact tech device — not yet opened, still in its box, which she has clearly just retrieved. Her expression toward it: reluctant hope. Shot on Canon R5, 35mm, f/2.0, cool overhead fluorescent grade, hard shadows. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🏆 Ángulo aspiracional — rendimiento ganado

A sharp man, late 30s, Japanese or Korean features — lean jaw, focused dark eyes, clean short hair. He stands at a standing desk in a minimal loft-style home office — exposed concrete wall behind him, floor-to-ceiling window to his left flooding the space with cool bright morning light. He wears a fitted dark navy crewneck and slim-fit charcoal trousers — dressed as someone who takes their work seriously but doesn't need a suit to prove it. Both hands rest lightly on the desk surface, fingers spread — the posture of someone who just finished something. A premium laptop is open in front of him, screen partially visible with a clean dashboard interface. He holds a sleek wireless earbud case in his right hand — closed, relaxed grip, as if he just pulled it from his pocket. His expression is calm confidence: direct gaze slightly past camera, jaw relaxed, the quiet satisfaction of someone operating at their ceiling. On the desk: a single matte black ceramic mug with steam, a slim mechanical pencil, a closed hardcover notebook with a pen clipped inside. No clutter. Everything intentional. Shot on Fujifilm GFX 100S, 63mm, f/2.8, cool editorial grade, light highlight roll-off on the window side. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### ⏱️ Ángulo urgencia — la decisión frente al lineal

A decisive woman, late 20s, Colombian or Venezuelan features — warm tan skin, strong eyebrows, sharp dark eyes, natural lip. She stands in a tech retail store, the kind with wide white aisles and product displayed under warm commercial spotlights. Behind her, competing devices line the shelves — tablets, earbuds, accessories — all intentionally soft-focus, shapes readable but no competing logos visible. She holds the product — a compact smart device still in its retail box — extended toward camera at chest height with her right hand, box tilted slightly so the front panel faces viewer. Her left hand taps the corner of the box once with her index finger: the gesture of someone who has made up their mind and is done deliberating. Expression direct, slightly raised chin, one eyebrow marginally higher — not aggressive, just certain. She wears a fitted rust-orange blazer over a white fitted tee, small gold studs. Hair blown straight, a single strand across the forehead. The store lighting is clean commercial — crisp shadows under the chin and hand, slight cool-white tone. Shot on Nikon Z9, 35mm, f/2.0, commercial editorial grade, background desaturated. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🔬 Ángulo ciencia — precisión que se ve

A composed woman, early 30s, Indian features — warm medium-brown skin, sharp dark eyes, wire-frame glasses, hair pulled back in a tight low bun. She stands in a clean technical environment — white walls, grey matte surfaces, a shallow shelf behind her with a few matte-black instruments and a single open notebook with handwritten annotations visible but not legible. A large monitor to her right shows a waveform or biometric graph — only partially in frame, detail visible. She holds the product — a precision wearable or health monitoring device — at eye level with both hands, inspecting its sensor array. Her index finger points to a specific element on the back of the device, gesture precise rather than performative. Her expression is analytical: head tilted slightly, eyes slightly narrowed, the look of someone reading data. She wears a clean white Oxford shirt, collar open, no jewelry except a single plain ring. Cool clinical lighting — large diffusion panels from above-left, secondary neutral fill from the right. No warm tones. Shot on Phase One, 40mm, f/4.0, product photography strobe, clinical white grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 👥 Ángulo social proof — el que ya lo tiene te cuenta

Two men, late 20s and early 30s, sitting together at a café terrace — a small round table, midday Mediterranean light filtered through an overhead shade structure casting dappled shadows. Man A: Moroccan or Algerian features, warm tan skin, short natural hair, a small gold chain at the collarbone, wearing a white linen shirt open at the collar. Man B: Spanish or Italian, lighter olive skin, slight stubble, wearing a grey fitted t-shirt. Man A holds his wrist up slightly, smartwatch face toward his friend — not staged, more like "look at this thing it just did." His expression is easy enthusiasm: half-smile, eyebrows raised slightly. Man B leans forward, forearms on the table, genuinely looking — his expression is recognition and curiosity, the micro-expression of someone who is suddenly interested. On the table: two short espresso cups, one already empty, a pair of keys with a small keychain, a crumpled receipt. The overhead shade creates irregular moving shadow patterns across their arms and the table. Shot on Leica M11, 35mm Summilux, f/2.0, warm afternoon documentary grade, candid. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🌙 Ángulo nocturno — el hogar que se apaga solo

A relaxed woman, early 40s, Northern Italian or French features — light olive skin, hazel eyes heavy from the hour, dark hair loose and slightly messy from the evening. She stands in a living room at 10:45pm — the wall clock visible in the background, slightly out of focus. The space is winding down: one floor lamp on low, the TV off, a throw blanket draped over the back of the sofa. She holds a small smart home hub or voice device in one hand at waist height, her index finger lightly grazing the top edge — the gesture of someone who just tapped it to set an alarm or turn off the lights. Half the room is already dark; the remaining lamp casts a warm amber pool around her and the device. Her expression is entirely at ease: jaw soft, slight downward cast to the eyes, the total relaxation of the end of a long day. She wears a worn dark burgundy oversized cardigan over a thin white t-shirt, bare feet. Behind her: a low shelf with three books leaning against each other, a small potted succulent, a single framed photo face-forward but too blurred to identify. Shot on Sony A7III, 50mm, f/1.4, amber practical light only, deep shadow on the far half of the room. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🔄 Ángulo transformación — el antes implícito

A man, mid-40s, West African features — deep warm-brown skin, broad jaw, calm dark eyes with slight smile lines at the corners. He sits at a clean kitchen table, natural morning light from a window to his right. He wears a plain white t-shirt and has clearly just woken up — but his posture is upright and his expression is alert, settled. On the table in front of him: a fitness tracker or health wearable lying face-up, its screen showing a sleep score or recovery metric — bright, good, specific numbers. He looks at it with both hands wrapped around a ceramic coffee mug, elbows on the table — reading the data the way you read something that confirms what your body already told you. His expression is quiet satisfaction: the look of someone whose numbers match how they feel. Nothing performative. The table surface is clean wood with a single small plant in a white pot to the far side. In the background, blurred: the kitchen, a wall calendar with one day circled. Shot on Sony A7IV, 40mm, f/2.2, warm morning grade, soft natural side light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🤖 Ángulo doméstico — la tecnología que ya es parte de casa

A woman, late 30s, East Asian features — warm skin, dark eyes, straight dark hair just past the shoulder. She stands in a modern kitchen, early evening, wearing a loose sage-green linen shirt tucked into wide-leg dark trousers — dressed to cook but not dressed down. She's mid-task: a cutting board with chopped vegetables visible on the counter behind her, a pot with a lid on the stove. She turns slightly toward a small robot vacuum that has just appeared in the doorway between the kitchen and the hallway — not startled, barely registering it, in the casual way you acknowledge something that simply belongs. Her left hand holds a wooden spoon at her side; her right hand holds her phone at a relaxed angle — she just glanced at it for a recipe. The robot is visible in the lower right edge of frame — compact, matte charcoal finish, its indicator light a soft blue. She looks toward it with the half-smile of someone who silently appreciates something without stopping what they're doing. Warm evening kitchen light from recessed ceiling fixtures. Shot on Canon R5, 35mm, f/2.5, warm domestic grade, gentle ambient fill. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### 🎧 Ángulo sensorial — el sonido que aisla el mundo

Extreme close-up: a man's right hand placing a single wireless earbud into his right ear — the moment of insertion, fingertip pressing the earbud gently into the concha, wrist slightly rotated. The earbud is matte black or dark grey, its shape precise and engineered, stem pointing slightly downward at rest. His skin is warm medium-brown, knuckles slightly prominent, a thin silver ring on the middle finger — no nail polish, nails cut short and clean. The outer ear is fully visible: natural cartilage detail, a tiny scar on the lobe from an old piercing that closed. Shallow depth of field — the fingertip and earbud in absolute focus, the ear softening behind, the background a completely indeterminate warm dark blur. Warm directional light from camera-right catches the matte finish of the earbud and the micro-texture of skin. On the far right edge of frame, barely in focus: the open earbud case resting on a matte surface, the second bud still seated inside. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto strip softbox from camera-right, warm skin grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

*Prompts optimizados para Gemini Imagen — énfasis en hiperrealismo humano, gestualidad auténtica y referencia técnica fotográfica.*

## Mascotas
*Alimentos, suplementos, accesorios, cuidado animal*

---

### Ángulo afectivo — amor incondicional
A warm woman in her 30s sits cross-legged on a living room floor, natural afternoon light from a large window. A happy medium-sized dog sits beside her, looking up with adoration. She holds the pet product in one hand while scratching behind the dog's ear with the other. Genuine affection, smiling down at the dog. Cozy room: soft rug, comfortable sofa background, dog toys scattered naturally. Warm tones — honey, cream, soft browns. Radiates the bond between human and pet. Shot at 40mm, lifestyle editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo salud — cuidado responsable
A concerned but loving pet owner in their 30s kneels on a clean kitchen floor, eye-level with their dog or cat. They hold the pet supplement in one hand, reading the label carefully, while their other hand rests on the pet's back. Pet looks healthy and trusting. Modern clean kitchen — white surfaces, water bowl nearby, natural window light. Communicates thoughtfulness of a pet parent who researches. Neutral clean tones — white, light grey, soft green accents. Shot at 35mm, natural light, editorial documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo aventura — compañeros de vida
A young active person in their late 20s sits on the tailgate of a car or SUV at a scenic overlook, golden sunset behind them. A medium-large dog sits beside them, both looking out at the view. The person holds the pet product while pouring or offering some to the dog. Both look windblown and happy after an adventure. Outdoor gear, hiking boots, a backpack nearby. Golden-warm adventurous tones against dramatic sky. Shot at 35mm, outdoor adventure editorial, lens flare from setting sun. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo cotidiano — momento de alimentación
A gentle person in their 40s crouches in a bright kitchen, pouring pet food from the product bag into a clean ceramic bowl. Their cat or small dog watches expectantly with tail wagging or ears perked. The person smiles at the pet. Kitchen is organized and warm — a window with herbs on the sill, a coffee cup on the counter, morning light. The scene captures the daily ritual of feeding with care. Warm domestic tones — natural wood, white, sage green. Shot at 40mm, lifestyle, slightly low angle showing person and pet at same level. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo veterinario — respaldo profesional *(nuevo)*
A pet owner in their 30s sits in a bright, modern veterinary waiting room, their calm cat in a carrier beside them. A vet (partially visible) hands the owner the product while pointing to an informational brochure. The owner looks relieved and engaged. Clean clinical environment softened by plants and natural light. The scene communicates trust in expert recommendation. Cool clean tones — white, soft teal, natural skin. Shot at 50mm, documentary, shallow depth on owner and product. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo ternura — durmiendo juntos *(nuevo)*
A person in their late 20s lies on their side on a comfortable sofa, a small dog or cat curled up against their chest — both asleep. The pet product sits on the side table beside them, naturally integrated. Afternoon golden light streams through half-open blinds, creating soft stripes across the scene. A blanket is loosely draped. The stillness and warmth communicates deep trust and daily bond. Very soft warm tones — honey, cream, rose. Shot at 50mm, extreme shallow depth of field, lifestyle intimate. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Moda & Indumentaria
*Ropa, calzado, accesorios, textil*

---

### Ángulo aspiracional — statement de estilo
A stylish person in their late 20s stands on a quiet urban street in golden hour light — sun low, casting long warm shadows. They wear the fashion product prominently, styled as the hero piece. Confident but natural pose — weight on one leg, hand adjusting collar or touching sunglasses. Behind them, aesthetically interesting building facade — exposed brick or clean modern lines — blurred. Editorial street-style. Rich warm tones — golden, amber, deep shadows. Shot at 85mm, shallow depth of field, fashion editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo cotidiano — estilo real
A relaxed person in their 30s walks through a bright, airy café or market, wearing the fashion item naturally as part of a complete outfit. Shot candidly — mid-step, genuine smile, caught in motion. Vibrant but not distracting environment: people blurred, hanging lights, wooden furniture. Canvas tote or coffee cup in hand. Natural daylight. Muted warm palette — oat, soft denim, terracotta, natural fabrics. Product visible and identifiable without being "presented." Shot at 50mm, handheld documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo nocturno — salir a brillar
A striking person in their late 20s stands outside a dimly lit restaurant or bar entrance, warm interior glow spilling out behind them. They wear the fashion piece as the star of a going-out look. Leaning slightly against a doorframe, one hand in pocket, confident half-smile. The contrast between the dark street and warm interior light creates dramatic rim lighting on the outfit. City elements softly blurred — a taxi, street lamps, reflections on wet pavement. Moody warm-cool contrast — deep navy, amber interior glow, golden highlights on fabric. Shot at 85mm, night fashion editorial, shallow depth. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo funcional — confort que rinde
A person in their 30s wearing the fashion item in a real activity — walking a dog in a park, cycling through a neighborhood, or carrying groceries. The garment is clearly performing: stretching, moving, breathing with them. Mid-action, natural expression of comfort and ease. Bright daylight, outdoor setting with green trees or urban elements. The scene proves the product works in real life, not just in a studio. Clean bright tones — sky blue, grass green, sun-washed neutrals. Shot at 35mm, action lifestyle, slightly motion-blurred background. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo prueba — el fitting decisivo *(nuevo)*
A person in their 30s stands in a fitting room, side profile to a full-length mirror. They've just put on the garment and their expression captures that exact moment of "yes, this is it." Hands smoothing the fabric at the waist, eyes looking at reflection with satisfaction. The fitting room is simple — soft overhead light, a hook with their original clothes, clean white walls. A second piece of the same product is folded on the bench nearby. Communicates conversion at the point of decision. Soft warm neutral tones. Shot at 40mm, candid editorial, medium depth. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo seasonal — nueva temporada *(nuevo)*
A person in their late 20s stands near a window in a bright, organized wardrobe room. They hold the new seasonal piece up against their body, comparing it to the rest of their wardrobe visible behind on a hanging rail. Expression is anticipatory delight — "this changes everything." Natural light floods the space. The wardrobe behind shows a curated, considered collection — quality over quantity. Soft neutral tones with one pop of the new garment's color. Shot at 35mm, editorial lifestyle. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Hogar & Decoración
*Muebles, textil hogar, velas, objetos deco*

---

### Ángulo lifestyle — el espacio transformado
A contented person in their 30s relaxes in a beautifully styled living room where the home product is integrated naturally — throw blanket on sofa, candle on coffee table, or decorative object on shelf. Warm late-afternoon light through linen curtains, honey-toned atmosphere. Person holds book and tea, fully at ease. Room tells a story of taste: plants, curated objects, neutral textures. Warm earthy tones — sage, terracotta, cream, natural linen. Shot at 35mm, interior editorial, medium depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo hygge — calidez invernal
A serene person in their 30s sits on a deep sofa wrapped in the textile product (throw, blanket, cushion arrangement), holding a steaming mug, looking out a rain-streaked window. The room is warm despite the grey outside — candles burning on the sill, soft warm lamp light, a stack of books nearby. They wear thick wool socks and an oversized sweater. The entire scene is a visual hug. Muted warm tones — cream, cinnamon, soft grey, candlelight amber. Shot at 50mm, intimate editorial, very shallow depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo renovación — transformación en proceso
A person in their 30s stands in a bright room mid-decoration, holding the product (a vase, lamp, or textile) and holding it up to visualize where to place it. The room is half-styled — some areas beautiful and done, others bare or in progress. Paint swatches on the wall, a stepladder nearby, natural light flooding the space. Expression of creative excitement and possibility. Bright, optimistic tones — white walls, warm wood, pops of the product's color. Shot at 35mm, lifestyle editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo regalo — el objeto perfecto *(nuevo)*
A person in their 30s sits on the floor of a bright living room surrounded by carefully chosen wrapping tissue, holding the home product up with both hands — deciding how to present it. A gift bag and ribbon are nearby. Their expression is quiet delight — they know they chose well. Large window behind, morning light, white walls. The product is the protagonist. Clean warm tones — white, blush, warm wood. Shot at 40mm, lifestyle editorial, soft shadows. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo sensorial — el primer encendido *(nuevo)*
*Específico para velas, difusores, productos aromáticos.*
A person in their 30s leans slightly toward a just-lit candle on a minimal wooden table, eyes closed, inhaling the first moments of scent. Their expression is pure sensory pleasure — a small involuntary smile. The room around them is simple and beautiful: afternoon light through sheer curtains, a single plant, linen cushions on a sofa behind. The candle's small flame reflects in their slightly glossy eyes as they open them. Warm amber and cream tones, soft shadows. Shot at 50mm, extreme shallow depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Joyería & Accesorios
*Anillos, collares, relojes, carteras, lentes*

---

### Ángulo elegancia — brillo personal
A poised person in their 30s stands in a softly lit dressing area — large mirror, velvet chair, warm lamp creating intimate golden tones. They wear the jewelry piece or accessory as the focal point, one hand slightly adjusting or touching it — gesture of self-admiration. Simple dark outfit to make the accessory pop. Mirror reflects light, creating secondary light source. Quiet self-assurance. Rich warm tones — gold, deep burgundy, cream. Shot at 85mm, very shallow depth of field, jewelry commercial quality. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo cotidiano — elegancia diaria
A confident woman in her 30s sits at a coffee shop window, wearing the jewelry piece as part of an effortless everyday look. One hand gestures naturally as if mid-conversation, the bracelet or ring catching window light. She holds a white ceramic cup in the other hand. Simple outfit — blue oxford shirt, rolled sleeves showing the accessory. The café is bright and modern behind her, softly blurred. Shows luxury as a daily companion, not a special occasion. Bright natural tones — white, light blue, warm gold highlights. Shot at 50mm, lifestyle editorial, medium depth. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo regalo — emoción de recibir
A woman in her early 30s sits on a neutral sofa, holding a just-opened jewelry box with visible delight — mouth slightly open, eyes bright, genuine surprise. The accessory catches the light from a nearby window. A gift card or wrapping paper sits beside her. One hand touches her chest in an instinctive grateful gesture. Warm intimate tones — soft gold, blush, cream backdrop. Shot at 50mm, shallow depth of field on the jewelry piece, candid editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo íntimo — el significado detrás *(nuevo)*
A woman in her 40s sits in a quiet, warm room, holding a piece of jewelry in her open palm — examining it with soft nostalgia or quiet pride. Perhaps a ring she earned herself, or a piece that marks a milestone. Her expression is contemplative and tender, not performative. Simple clothing, natural light from a side window. A few personal objects on the surface beside her — a letter, a small photo frame, blurred. The product carries emotional weight beyond aesthetics. Warm amber, cream, deep shadow. Shot at 85mm, extreme shallow depth of field, documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Educación & Cursos
*Formación online, coaching, mentoría*

---

### Ángulo transformación — el momento "lo logré"
A proud person in their early 30s at a clean home desk, laptop showing a completion dashboard (blurred). They lean back with accomplished expression, hands behind head or clasped in celebration. Natural side window light creates motivational warmth. Desk has notebook with handwritten notes, pen, coffee cup. Bookshelf or plant behind — signs of growth. Professional breakthrough moment. Warm aspirational tones — golden light, warm wood, clean whites. Shot at 40mm, editorial portrait, medium depth. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo problema — estancamiento profesional
A person in their late 20s slumps at a desk surrounded by open textbooks, laptop, and scattered papers. They stare at the screen with glazed eyes, one hand supporting their chin. A coffee cup is empty. Post-it notes on the wall show attempted organization. The room feels small and overwhelming. Late night — desk lamp is the only light source, creating harsh shadows. Cool desaturated tones — blue-grey, white, flat artificial light. Shot at 35mm, documentary, slightly messy frame. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo comunidad — aprender juntos
Two people in their 30s sit at a bright co-working table, collaborating over laptops. One points at a screen while the other nods with understanding, holding a notebook. The course or platform interface is visible (blurred) on both screens. Modern energizing space — white walls, a big window, a plant, motivational art. Both dressed smart-casual. Bright optimistic tones — white, soft blue, warm wood, green accents. Shot at 35mm, lifestyle editorial, candid interaction. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo inversión — apostar por una misma *(nuevo)*
A woman in her 30s sits at a kitchen table, laptop open showing an enrollment or checkout page (blurred). She has her credit card in one hand, the other hovering over the keyboard — a decisive moment of commitment. Her expression is not anxious but resolved, grounded. Beside the laptop: a notebook with a handwritten list of goals, a mug, morning light through a window. The scene says "this is the moment I chose myself." Warm optimistic tones — cream, warm wood, golden light. Shot at 40mm, candid lifestyle. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo aplicación — el conocimiento en práctica *(nuevo)*
A professional in their 30s stands confidently in a real workplace or creative studio, mid-task — presenting to colleagues (blurred), working on a project, or demonstrating a skill. Their body language shows ownership and capability. The course branding is visible on a laptop or notebook in their hand. Behind them, the environment confirms their field: design tools, business materials, a whiteboard. The scene says "I learned this, and now I do this." Bright professional tones, natural light. Shot at 35mm, corporate documentary. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Servicios Profesionales
*Consultoría, agencias, coaching, legal, contable*

---

### Ángulo confianza — el experto accesible
A professional in their 40s sits in a modern meeting space, natural light from large windows creating a bright, trustworthy atmosphere. Smart casual — blazer over simple top. They hold a tablet or document, leaning slightly forward with engaged, approachable expression. Behind them: whiteboard with strategic notes, books, a plant. Expertise + approachability. Clean professional tones — navy, white, soft grey, warm accents. Shot at 50mm, corporate editorial, shallow depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo resultado — impacto medible
A satisfied professional in their 30s stands confidently in front of a large screen or whiteboard showing growth charts or positive metrics (blurred but clearly upward). Arms crossed with quiet pride, direct smile at camera. Well-dressed in business casual — a quality shirt, rolled sleeves. The office behind is modern, clean, successful. Morning light creates an optimistic, forward-looking atmosphere. Clean bright tones — white, charcoal, one accent brand color, warm natural light. Shot at 40mm, corporate editorial, medium depth. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo humano — detrás del servicio hay personas
A warm professional in their 30s sits at a round table with a client (blurred or partially visible), leaning in with genuine interest, notepad in hand. The meeting space is casual — a bright café or casual office with plants and natural light. Two cups of coffee on the table between them. The professional's expression shows active listening, empathy. Warm, inviting tones — natural wood, cream, soft grey, green plant accents. Shot at 50mm, documentary moment, shallow depth on the professional. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo proceso — el trabajo detrás *(nuevo)*
A professional in their 30s works alone at a spacious desk covered in organized materials — documents, a laptop with spreadsheets (blurred), sticky notes in a clear system. They lean forward focused, pen in hand, marking something significant. The office or studio around them communicates serious craft: bookshelves, a whiteboard with diagrams. It's 8am or 9pm — early dedication or late commitment. The scene builds trust by showing the work. Cool professional tones — charcoal, white, warm lamp accent. Shot at 35mm, documentary corporate. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Bebés & Maternidad
*Pañales, cremas bebé, productos maternales, juguetes 0–3*

---

### Ángulo tierno — conexión madre-hijo
A young mother in her late 20s sits in a nursery rocking chair, soft morning light through sheer white curtains. She holds a baby (6–12 months) on her lap with one arm while holding the baby product in the other hand — applying cream or presenting the package naturally. Both are in soft pastel clothing — whites, pale yellows. The nursery is minimal but warm: a crib visible behind, a small stuffed animal, a mobile. Her expression is pure tenderness, looking down at the baby. Ultra-soft warm tones — cream, pale pink, butter yellow, warm whites. Shot at 50mm, intimate portrait, very shallow depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo seguridad — protección informada
A parent in their early 30s stands in a bright, clean bathroom, holding the baby product up to read the label carefully, one hand supporting a baby on their hip. The baby plays with a teething toy, content. The bathroom is spotless — white tiles, a small tub in the background, warm natural light. Expression: serious but loving, the look of a parent who checks every ingredient. Clean, clinical but warm tones — white, soft blue, natural skin tones. Shot at 40mm, editorial documentary, commercial quality. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo padre presente — paternidad activa *(nuevo)*
A father in his early 30s sits on the floor of a nursery, fully engaged — changing, bathing, or applying the product to the baby with careful concentration. Baby on a clean mat, kicking happily. The father's expression is absorbed and tender — no performance, just care. He's in casual home clothes, barefoot. The nursery is modern, gender-neutral — light wood, soft grey, white. The scene normalizes involved fatherhood. Soft neutral tones — white, light wood, sage. Shot at 40mm, candid documentary, natural light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo agotamiento — la maternidad real *(nuevo)*
A mother in her late 20s sits on the floor of a nursery at 3am, back against the crib, baby finally asleep in her arms. The only light is a soft nightlight casting warm amber. Her expression is exhausted but fiercely loving. The product sits beside her — already used, already part of the night routine. Dark circles, hair loose, oversized sleep shirt. No glamour, total authenticity. The scene says "I'd do all of this again." Deep amber and near-black tones, one warm light source. Shot at 35mm, documentary intimate. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Automotriz
*Accesorios, limpieza, gadgets de auto, lubricantes*

---

### Ángulo orgullo — el auto como extensión personal
A proud car owner in their 30s stands beside their clean vehicle in a garage or driveway, golden late-afternoon light creating long shadows. They hold the car product in one hand while the other rests on the vehicle's hood — a possessive, caring gesture. The car gleams, reflecting the warm light. They wear casual but neat clothes — jeans, a quality tee. Behind them, a partially visible organized garage shelf. Warm golden tones, deep shadows, metallic reflections. Shot at 35mm, automotive editorial, dramatic light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo ritual — cuidado dominical *(nuevo)*
A person in their 30s stands in their driveway on a bright Sunday morning, bucket and product nearby, mid-wash of their vehicle. They've paused, looking at the clean section with satisfaction — cloth in one hand, product bottle in the other. Casual weekend clothes, sneakers. The neighborhood is quiet behind them, soft morning light. The scene captures the meditative pleasure of caring for something you own. Clean bright tones — sky, white suds, metallic gloss. Shot at 40mm, lifestyle editorial. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

### Ángulo viaje — en ruta *(nuevo)*
A driver in their 30s pulls over at a scenic rest stop — mountains or coastal road in the background, golden hour light. They step out of the vehicle and hold the product (interior freshener, emergency kit, phone mount) while looking out at the view with a relaxed smile. The car door is open, road visible. Windblown hair, comfortable travel outfit. The scene communicates freedom + preparedness. Dramatic natural tones — warm gold, deep sky, dusty road. Shot at 35mm, travel editorial, lens flare. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.

---

## Guía de construcción de prompts — referencia rápida

### Estructura universal

```
[Descripción física del sujeto y edad] + [Acción con el producto] + 
[Contexto espacial específico] + [Tipo de luz y atmósfera] + 
[Paleta de tonos] + [Especificación técnica de cámara] + 
"Subject and product on right side only. Left half must remain completely clean for pre-rendered text."
```

---

### Tabla de tonos y parámetros por ángulo

| Ángulo | Escena ideal | Iluminación | Paleta | Cámara |
|--------|-------------|-------------|--------|--------|
| Emocional / ritual | Baño, dormitorio, cocina al amanecer | Warm golden, suave, natural | Cream, warm beige, blush | 50mm, shallow DOF |
| Problema | Baño desordenado, escritorio caótico | Dura, unflattering, frontal | Desaturado, frío, gris | 35mm, documentary |
| Aspiracional | Vanity, estudio, espacio minimal curado | Golden hour, modelada, perfecta | Cream, soft gold, sage | 50mm, editorial |
| Urgencia / decisión | Tienda, farmacia, gimnasio | Comercial, limpia, bien definida | Neutros + pop de color | 35mm, comercial |
| Transformación | Espacio organizado y luminoso | Limpia, equilibrada, optimista | Cream, honey, warm wood | 40mm, lifestyle |
| Vulnerabilidad | Ventana con luz directa, espacio real | Dura, midday, sin filtros | Neutros fríos, raw | 50mm, documentary |
| Nocturno | Dormitorio, vanity de noche | Lámpara/vela, amber, bajo contraste | Amber, ivory, near-black | 50mm, muy shallow DOF |
| Ciencia / técnico | Escritorio, consultorio, espacio clínico | Neutra, clara, sin drama | Blanco, azul-gris, clínico | 40mm, sharp focus |
| Social proof | Terraza, living, parque | Natural, doméstica, sin pose | Terracota, olive, golden | 35mm, candid |
| Aventura / outdoor | Naturaleza, montaña, trail, ciudad | Golden hour exterior, rim light | Orange, sage, granite | 35mm, lens flare |
| Familiar / doméstico | Cocina, comedor, living | Natural, cálida, ventana lateral | Buttercream, wood, sage | 35mm, lifestyle |
| Premium / gourmet | Cocina marble, restaurante, showroom | Dramática lateral, moody | Charcoal, copper, deep green | 50mm, food editorial |
| Hygge / invernal | Living con lluvia afuera, sofá | Vela + lámpara, amber cálido | Cream, cinnamon, grey | 50mm, muy shallow DOF |
| Íntimo / nocturno maternidad | Nursery, 3am, nightlight | Un solo punto de luz, amber | Near-black, amber, cream | 35mm, documentary |

---

*Fin del archivo — versión 2.0*