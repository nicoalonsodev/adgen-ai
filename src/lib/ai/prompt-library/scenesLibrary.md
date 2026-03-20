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
 
---
 
### 🪞 Ángulo emocional — el ritual de consumo
 
A woman, [late 20s / early 40s], [Latin American / Southern European] features — natural face, no makeup, hair loosely piled or falling at the shoulders. She sits at a small kitchen table or window ledge in early morning — the city or a garden barely visible through the glass behind her, still slightly out of focus from sleep. She holds a [mug / glass / bottle of product] in both hands at chest height, the way people hold something warm when they need grounding. The steam or condensation is visible — the product is real and present temperature. Her eyes are open but not yet fully in the day — soft gaze, no urgency, lips slightly parted in a private, unhurried exhale. The table surface: a small ceramic bowl with [superfood powder / granola / nuts] partially eaten, a spoon resting across the rim, a folded linen napkin slightly wrinkled from use. On the windowsill: one small plant, the light catching its leaves. The kitchen behind is warm and lived-in — not styled, not sparse. Morning light is golden and low, entering from the left. Shot on Sony A7R V, 35mm, f/1.8, warm morning grade, slight grain. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 😩 Ángulo problema — el cuerpo que pide un cambio
 
A person, [late 20s / mid 40s], [any ethnicity], mid-afternoon in an office, kitchen, or living room — the specific moment of an energy crash. They sit slightly slumped at a desk or couch, one hand supporting their head, elbow on the surface. In front of them: the remnants of the problem — an empty coffee cup with a dried ring at the bottom, a wrapper from a processed snack, a half-eaten something that didn't satisfy. Their other hand scrolls a phone or rests flat on the table. Their expression is not dramatic — it is the dull, specific look of someone whose body is running on the wrong fuel and knows it. The light is flat and artificial — overhead office light or the grey light of a clouded afternoon window. On the desk or table: a visible clock or phone time showing 3–4pm, a full water glass untouched, and just within reach — slightly out of their current attention — the [product]: a [protein bar / functional drink / superfood packet / herbal tea] not yet opened. The solution is present but not yet chosen. Shot on Canon R5, 50mm, f/2.0, slightly desaturated cool grade, no fill light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### ✨ Ángulo aspiracional — la vitalidad que se nota
 
A radiant person, [early 30s / early 40s], [Mediterranean / Latin American features] — warm skin with a natural glow that reads as health, not product. They stand or sit in a bright, airy kitchen or outdoor terrace, morning light flooding the space. Their posture is open and energized — not posed, but the kind of upright ease that comes from a body that is well. They hold the [product] at their side or on the table in front of them, naturally — as if it was just set down a moment ago, not arranged for camera. Their expression is composed and quietly satisfied: the look of someone who has made a decision that is working. On the surface: a [smoothie bowl / protein shake glass / tea cup] partially consumed with a spoon or straw resting on the rim, evidence of an actual meal rather than a prop. A few whole ingredients are visible nearby — [fresh fruit / nuts / seeds / herbs] — not styled, but present. Shot on Fujifilm GFX 100S, 63mm, f/2.8, warm editorial grade, soft highlight roll-off. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🛒 Ángulo urgencia — el descubrimiento en góndola
 
A person, [late 20s / early 30s], [any ethnicity], standing in a health food store or supermarket natural aisle — shelves of competing products soft-focused behind them, shapes and colors visible but no logos legible. They hold the [product] extended toward camera with one hand, label perfectly facing viewer. Their other hand holds a phone showing either a search result, a friend's recommendation in a chat, or a nutrition comparison — partially legible, enough to register. Their expression is the specific mix of recognition and decision: one eyebrow slightly raised, slight forward lean, the look of someone who has found what they were looking for. They wear a casual, clean outfit — tote bag on one shoulder, the kind of shopper who reads labels. The lighting is clean commercial — crisp overhead store lighting with warm product spotlight accents. Shot on Nikon Z9, 35mm, f/2.0, commercial editorial grade, slightly desaturated background to isolate product. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔄 Ángulo transformación — el hábito nuevo
 
A person, [mid 30s], [any ethnicity], photographed at a kitchen counter mid-preparation — the specific moment of building a new ritual. One side of the counter tells the old story: an empty coffee pod, a sugar bowl, a processed cereal box slightly pushed aside. The other side, where they stand, tells the new one: a [blender with superfood smoothie / shaker bottle with protein / cup of functional tea] being prepared, the [product] open and in use, a measuring spoon, a small bowl of fresh ingredients. Their posture faces the new side fully — one hand on the blender lid or shaker cap, the other holding the product, expression focused and quietly intentional. They wear comfortable home clothes — this is a Tuesday morning, not a photoshoot. The light comes from the window on the preparation side — warm and direct, while the old-habit side recedes into shadow. The transformation is spatial and behavioral, not theatrical. Shot on Sony A7IV, 40mm, f/2.2, split warm-cool grade across the counter. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🪟 Ángulo vulnerabilidad — el proceso real
 
A person, [late 20s / mid 30s], [any ethnicity], sitting on a kitchen floor or at a bare table in honest, unflattering morning light. They wear comfortable clothes — an old t-shirt, hair not done. In front of them: the [product] and a half-prepared [shake / bowl / drink] that is mid-process, not finished, not Instagram-ready. Their expression is not performing wellness — it is the honest look of someone who is trying, on a day when trying takes effort. Slightly tired eyes, natural skin with visible texture, a posture that is upright but not energized. One hand holds the product, the other stirs or mixes without looking — automatic, habitual, real. The kitchen around them is ordinary: a dish in the drying rack, a plant that needs water, a grocery list on the fridge door partially visible. The lighting is overcast window light — grey and honest, no warmth added. The message is not aspiration — it is recognition. Shot on Leica SL2, 50mm, f/2.0, documentary neutral grade, no retouching. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌙 Ángulo nocturno / hygge — el ritual de calma
 
A person, [late 20s / early 40s], [any ethnicity], curled into a couch or armchair in a dim, warm living space at night. They wear a soft oversized knit or a worn hoodie, feet tucked under them, a blanket partially draped. They hold a [mug of herbal tea / warm functional drink / small bowl of evening snack] in both hands — the gesture of someone receiving comfort from something warm. The steam from the drink rises faintly, catching the amber lamplight. The only light sources: one warm floor lamp behind them and the faint glow of a candle on the coffee table, its wax half-melted, flame reflected in the mug surface. On the coffee table: the [product packaging] placed naturally, a book face-down open to a page, a soft throw partially unfolded. The window behind shows darkness and faint rain on the glass. Their expression is completely at rest — eyes soft, jaw unclenched, a person who has arrived at the end of the day and found it good. Shot on Sony A7III, 50mm, f/1.4, very shallow depth of field, warm amber practical light grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔬 Ángulo ciencia — el ingrediente que justifica todo
 
A sharp person, [early 30s], [South Asian / East Asian / any ethnicity], at a bright, clean kitchen counter or a minimal desk. They hold the [product] up at eye level with one hand, the other hand pointing at a specific section of the ingredient label — index finger extended, precise. Their expression is analytical and confident: slightly narrowed eyes, head tilted a few degrees, the look of someone who knows exactly what they're looking at and why it matters. On the surface: a printed or hand-annotated ingredient comparison sheet, a few of the raw ingredients displayed beside the product — a small pile of [seeds / dried herbs / powder in a small bowl] — real, unprocessed, legible as source materials. A phone shows a research article or nutrition database screen, partially in frame. The lighting is clean and cool — diffused daylight, clinical precision, no warm styling. Shot on Phase One, 40mm, f/4.0, large softbox diffusion, product photography precision. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👥 Ángulo social proof — el descubrimiento compartido
 
Two people, [late 20s / early 30s], [any ethnicities — visibly different], sitting together at a café table, a kitchen, or an outdoor market. Person A reaches into their bag or across the table and produces the [product] — holding it toward Person B with the specific enthusiasm of someone sharing something that changed their routine: arm slightly extended, one eyebrow raised, the half-smile of someone who already knows the reaction they're about to get. Person B takes it, reads the label or smells it, expression moving from curiosity to genuine interest — the recognition of someone who has been looking for exactly this. Between them: two cups at different stages, an open food container, a farmers market bag with fresh produce spilling slightly at the top. Neither looks at camera. The conversation is the whole frame. The light is warm and natural — morning café light or outdoor dappled sun. Shot on Leica M11, 35mm Summilux, f/2.0, candid documentary style, warm afternoon light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤍 Ángulo minimalismo — un solo ingrediente, toda la verdad
 
A person, [mid 30s / early 40s], [any ethnicity with neutral palette], standing in a completely uncluttered kitchen or white space — clean surfaces, no styling, no props. They hold the [product] in both open upturned palms at chest height — the offering gesture of someone with nothing to hide. Their expression is completely still: not selling, not performing, simply certain. Beside them or on the surface: a single raw ingredient — one [cacao pod / turmeric root / matcha scoop on a ceramic spoon / whole coffee cherry] — the only other object in frame. The product and the source. That is the entire argument. Their clothing is neutral — white, oatmeal, or slate, no pattern. A single beam of natural daylight from a narrow window rakes across the scene at 45 degrees, catching the product surface. Everything else is negative space. Shot on Hasselblad X2D, 90mm, f/2.8, natural daylight only, ultra-clean grade, maximum negative space. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👩‍👧 Ángulo generacional / familiar — la mesa que conecta
 
Two or three family members across generations — a grandmother or parent [50s–60s] and a younger person [20s–30s] — sharing a meal or a ritual at a warm kitchen or dining table. The older person prepares or serves the [product or dish containing it] — their movements practiced and automatic, the ease of someone who has done this a thousand times. The younger person watches, participates, or receives — expression of familiarity and comfort, the look of someone who grew up with this but is only now understanding why it matters. On the table: real food in real vessels — ceramic bowls with slight chips, a wooden spoon, linen napkins slightly crumpled, the product visible and integrated into the scene rather than displayed. Steam rises from something warm. The light is warm domestic afternoon — window sun mixing with the ambient warmth of a kitchen that has fed people for years. Shot on Canon R5, 50mm, f/2.5, warm intimate grade, slight lens diffusion. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤲 Ángulo sensorial — el placer que entra por los sentidos
 
Extreme close-up: a person's hands preparing or consuming the [product] — the specific gesture of their trade. For [protein shake]: both hands on a shaker, thumbs pressing the lid, the liquid inside shifting color as it mixes, a fine mist of powder still settling on the inner walls. For [superfood bowl]: a spoon lifting a loaded scoop — seeds, fruit, powder visible in layers, the liquid pooling slowly in the spoon's well. For [herbal tea]: both hands cradling a ceramic mug, fingertips pressing into the warmth, steam rising in a thin column, the surface of the liquid showing a faint swirl. For [snack]: one hand picking up a piece — the texture of the surface catching warm side light, a slight crumb falling. The product packaging is partially visible at the edge of frame — not centered, just present. The surface beneath is real: a worn wooden board, a ceramic plate with slight glaze imperfections, a linen cloth with natural texture. The lighting is warm and directional — a soft window light from camera-left, catching every texture. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto strip softbox from camera-left, warm food photography grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌍 Ángulo aventura / outdoor — energía en movimiento
 
A person, [late 20s / early 30s], [Latin American / Southeast Asian / any ethnicity], outdoors in an active setting — a trail head, a park at sunrise, a beach at low tide, or a city street mid-run pause. They are mid-activity or just stopped: slightly flushed skin, hair wind-affected, clothing functional and worn. They hold the [product — protein bar / functional drink / energy shot] in one hand, mid-consumption or just finished — the cap off, a bite taken, a straw in. Their expression is not posed exertion — it is the specific, private satisfaction of a body that is moving well and being fed well. Their other hand rests on a knee or holds a water bottle. Behind them: the environment blurred but present — trees, trail, water, urban movement — the world continuing around them. The lighting is natural outdoor morning — directional sun, clean shadows, the energy of a day in full motion. Shot on Fujifilm X-T5, 23mm, f/2.0, natural outdoor grade, slight film emulation, warm skin tones preserved. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
*Prompts optimizados para Gemini Imagen — énfasis en autenticidad alimentaria, gestualidad real y hiperrealismo sensorial.*
*Sub-rubros cubiertos: Snacks saludables — Bebidas funcionales / jugos — Infusiones / tés / café — Proteínas / suplementos — Superfoods / ingredientes*
*Posicionamiento: Bienestar / Performance / Placer*
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
 
---
 
### 🪞 Ángulo emocional — ritual de aprendizaje
 
A focused person, [late 20s / early 40s], [Latin American / Southern European] features — natural face, slight tiredness around the eyes that reads as dedication rather than neglect. Sitting at a wooden desk in a home corner converted into a study space: warm-painted wall behind, a shelf with a few books, a small succulent in a ceramic pot. It is late afternoon — golden light enters through a window to the left, casting long soft shadows across the desk surface. They have a laptop open in front of them, screen showing the [platform / course interface] — glowing softly without being the focal point. One hand rests on the keyboard, the other holds a pen over an open notebook with handwritten notes, some underlined, some circled. A ceramic mug of tea or coffee sits to the side, slightly steaming, half-full. Their expression is one of quiet concentration — not stressed, not performing focus, but genuinely absorbed. Earbuds in, one slightly loose. The desk surface has a worn quality: a pencil with the eraser used down, a sticky note with a word or phrase, a folded receipt used as a bookmark. Calm, intimate, self-directed. Shot on Sony A7R V, 35mm, f/1.8, warm afternoon grade, slight grain. Subject and screen/product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 😩 Ángulo problema — el estancamiento profesional
 
A person, [early 30s / mid 40s], [any ethnicity], sitting at a corporate office desk or a kitchen table that doubles as a workspace. The space reads as competent but uninspired — a standard laptop, a printed document with highlighted lines, a company ID badge hanging from the monitor corner. Their posture is slightly slumped: shoulders inward, chin resting on one hand, elbow on the desk. The expression is one of quiet frustration — not dramatic, but the look of someone who has realized they've stopped growing. Eyes slightly unfocused, looking at something off-frame or slightly past the screen. The lighting is flat and artificial — overhead white office light or a single desk lamp with a cool bulb, the kind that reveals fatigue. On the desk: a coffee cup that has gone cold, a planner open to a page with very few entries, a printed job posting or professional development brochure slightly crumpled near the edge. In the blurred background: other people working, or an empty hallway, or a wall calendar with nothing circled. Shot on Canon R5, 50mm, f/2.0, slightly desaturated cool grade, no fill light. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### ✨ Ángulo aspiracional — el resultado logrado
 
A confident person, [30s / early 40s], [Mediterranean / Latin American] features — warm skin, relaxed posture, dressed professionally but not stiffly: a well-fitted blazer over a casual shirt, or a clean linen blouse. They sit at a bright, organized home office or co-working space — large window behind them, natural light flooding the room. On the desk: a laptop half-closed, a professional notebook with a pen clipped to it, a small [certificate / printed diploma / course completion badge] leaning casually against the monitor — visible but not forced. They look directly into the camera with the composed expression of someone who has already done the work: relaxed jaw, slight natural smile, posture open and grounded. One hand rests on the desk near the [certificate / device], the other relaxed in their lap. The environment reads as earned success — not luxury, but intention. A shelf in the background shows books, a plant, and one framed photo out of focus. Shot on Fujifilm GFX 100S, 63mm, f/2.8, warm editorial grade, soft highlight roll-off. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🛒 Ángulo urgencia — la decisión en el momento
 
A person, [late 20s / early 30s], [any ethnicity], sitting at a desk or on a couch with a laptop open, the screen showing a [course enrollment page / landing page] with a visible countdown timer or limited spots indicator — legible enough to read the format, not the exact copy. Their posture is forward-leaning: both elbows on the desk, face close to the screen, one hand on the trackpad. Their expression is at the edge of decision — brows slightly furrowed, lips pressed, the look of someone who has read the same page twice and is about to click. Their other hand holds a credit card loosely, not yet placed on the keyboard. The lighting is a mix of screen glow and warm ambient lamp light — the screen reflects faintly on their cheekbones. On the desk: a glass of water, a phone face-down, a sticky note with a few pros/cons or a name and number written on it. The room is slightly dim — it feels like a late-night moment of decision. Shot on Nikon Z9, 35mm, f/2.0, cool ambient with warm screen glow grade. Subject and screen on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔄 Ángulo transformación — el antes implícito
 
A person, [mid 30s], [any ethnicity], photographed in two implied states within a single frame: they sit at a desk that is clearly mid-transition — one side shows old materials (a printed CV slightly worn, a closed textbook, a sticky note that reads "update LinkedIn"), the other side shows new energy: a laptop open to a [course dashboard], a fresh notebook with organized notes, a pen uncapped and recently used. The person themselves reads as in motion: they face the new side, posture upright, one hand actively scrolling or typing, the other holding a highlighter over the new notebook. They wear a clean, simple outfit — not corporate, not casual, but composed. Their expression is quietly motivated: focused eyes, slight forward lean, no performance. The light comes from the window on the new-materials side — the old side is in softer, receding shadow. The transition is spatial and emotional, not literal. Shot on Sony A7IV, 40mm, f/2.2, split warm-cool grade matching the two sides of the desk. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🪟 Ángulo vulnerabilidad — el miedo a empezar
 
A person, [late 20s / early 40s], [any ethnicity], sitting alone at a kitchen table or small desk in a modest, lived-in space. In front of them: a laptop open to a [course sign-up page or platform homepage]. They are not typing. Their hands are folded in their lap or resting flat on the table — the gesture of someone who has arrived but hasn't moved yet. Their expression is honest and slightly raw: the specific look of wanting something and being afraid of it at the same time. Eyes looking at the screen but not quite seeing it, a slight tension in the jaw. The room is ordinary and real — a jacket hung on the chair back, a bill or envelope on the table corner, a phone with a cracked screen nearby. The lighting is natural and slightly flat — overcast window light, no warmth added. Nothing is styled. The laptop screen glows softly, the only thing with energy in the frame. Shot on Leica SL2, 50mm, f/2.0, documentary neutral grade, no retouching. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌙 Ángulo nocturno — el aprendizaje después de todo lo demás
 
A person, [late 20s / mid 30s], [any ethnicity], sitting at a desk or on a bed with a laptop propped on a pillow or lap desk, late at night. The only light sources: the laptop screen glowing warm, and a small bedside or desk lamp with a warm amber bulb. The room around them is dark and still — you sense a sleeping household, a quieted day. They wear comfortable clothes: a worn sweatshirt, hair loosely tied or slightly disheveled. On the surface nearby: a half-eaten snack on a small plate, a phone charging, a glass of water, earbuds coiled next to them. The laptop screen shows a [video lesson / module list / course interface] — mid-play, a progress bar partially filled. Their expression is one of quiet determination: eyes slightly heavy but alert, the look of someone who found the only hour that belongs to them. Shot on Sony A7III, 50mm, f/1.4, very shallow depth of field, warm amber practical light grade. Subject and screen on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔬 Ángulo ciencia — el método detrás del aprendizaje
 
A sharp person, [early 30s], [South Asian / East Asian / any ethnicity], sitting at a very organized desk in a bright, minimal space. They wear a clean Oxford shirt or structured top, hair pulled back or neatly kept, minimal accessories. In front of them: a laptop open to a [course platform], a printed or handwritten learning framework — a diagram, a skill map, or a structured note with levels and arrows. They hold a pen, pointing at a specific node in the diagram, head slightly tilted in analysis. Their expression is focused and precise — narrowed eyes, slight forward lean, processing rather than feeling. On the desk: a set of color-coded sticky notes arranged deliberately, a timer (physical or on screen), one textbook open to a specific page with a clip marking it. The lighting is clean and cool — a large window with diffused daylight, no warm tones, clinical and clear. Shot on Phase One, 40mm, f/4.0, softbox diffusion, product photography precision applied to human scene. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👥 Ángulo social proof — la recomendación entre pares
 
Two people, [late 20s / early 30s], [any ethnicities — visibly different from each other], sitting together at a café table or a shared workspace. One of them — Person A — has a laptop open showing a [course platform or completion screen], pointing at it with genuine enthusiasm, mid-explanation. Person B leans in, one elbow on the table, chin resting on their hand, expression reading authentic recognition — the look of someone who is already half-convinced. Between them: two coffee cups, one empty, one half-full, a phone face-up with a browser or app open, a shared notebook with a page turned toward Person B. The environment is warm and real: background café noise implied by blurred figures and warm overhead pendants, or an open-plan office with soft activity. Neither person looks at camera. The conversation is the whole world. Shot on Leica M11, 35mm Summilux, f/2.0, candid documentary style, warm afternoon light. Subject, laptop and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤍 Ángulo minimalismo — claridad ante el ruido
 
A person, [mid 30s / early 40s], [Scandinavian / Northern European features or any light-neutral palette], standing or sitting in a completely bare, quiet space — warm white wall with subtle plaster texture, no decoration, no clutter. They hold a single device — a tablet or closed laptop — in both hands at chest height, the way you'd hold something that has simplified your life. Their expression is completely still: not excited, not performing, simply clear. They wear a clean white or oatmeal-toned shirt, loose trousers in a neutral tone, no jewelry. The only other element in frame: the [course logo / platform name / certificate] visible on the device screen, catching light. A single beam of natural daylight from an off-frame narrow window rakes across the scene at 45 degrees, casting one long soft shadow. Everything else is negative space. Shot on Hasselblad X2D, 90mm, f/2.8, natural daylight only, high-contrast negative space, ultra-clean grade. Subject and device on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👩‍👧 Ángulo generacional — aprender para ellos
 
A parent, [mid 30s / early 40s], [Latin American / Mediterranean features], sitting at a kitchen or living room table with a laptop open to a [course platform]. In the background — slightly out of focus but unmistakably present — a child, [5–10 years old], playing quietly on the floor or doing homework at the same table. The parent faces the screen, one hand on the trackpad, expression one of quiet resolve: not stressed, but purposeful. The child looks up briefly toward the parent with an expression of simple familiarity — this is a normal moment in their household. The lighting is warm domestic — overhead kitchen light mixed with late afternoon window sun, the kind that makes ordinary rooms feel like home. On the table: a child's drawing near the parent's elbow, the parent's phone face-down, a glass of water, a notebook with scattered notes. The course is not the point — the reason for the course is. Shot on Canon R5, 50mm, f/2.5, warm intimate domestic grade, slight lens diffusion. Subject and screen on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤲 Ángulo sensorial — el placer táctil del aprendizaje
 
Extreme close-up: a person's hands at a desk — one hand writing in a notebook with a good pen, the other resting flat on the open page. The handwriting is real and slightly imperfect: a mix of printed and cursive letters, some words underlined twice, a small diagram with arrows in the margin. The notebook paper has a slight texture — cream-colored, slightly warm, not bright white. The pen leaves a faint ink trail still slightly wet on the last letters. Around the hands: the edge of a laptop keyboard partially in frame, a highlighter uncapped and resting diagonally, one corner of a printed [course workbook or module sheet]. The desk surface is light wood with natural grain. The lighting is warm and directional — a soft window light from the left, creating gentle shadows in the pen grooves and notebook spiral. Everything is slightly imperfect and very real. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto strip softbox from camera-left. Subject and materials on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌍 Ángulo aventura / expansión — el aprendizaje como apertura al mundo
 
A person, [late 20s / early 30s], [Latin American / Southeast Asian features], sitting at an outdoor table — a rooftop terrace, a hostel common area, or a café with a view of a city street. They have a laptop open and earbuds in, clearly mid-lesson, but their posture is open and expansive rather than hunched: back straight, one arm outstretched on the table, slight smile that reads as private satisfaction. Behind them: an urban landscape with movement — blurred figures, buildings, a skyline — the world going on while they carve out this moment inside it. The lighting is natural and dynamic — dappled sun or overcast bright daylight, the energy of outdoors. On the table: a passport or travel card visible near the laptop, a local coffee cup, a phone with a translation or map app open on screen. The [course / platform] on the laptop screen reads as a window into something larger than the street behind them. Shot on Fujifilm X-T5, 23mm, f/2.0, natural outdoor grade, slight film emulation. Subject and screen on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
*Prompts optimizados para Gemini Imagen — énfasis en hiperrealismo humano, gestualidad auténtica y referencia técnica fotográfica.*
---

## Servicios Profesionales
 
---
 
### 🪞 Ángulo emocional — la presencia antes de la reunión
 
A composed professional, [late 30s / early 40s], [Latin American / Southern European] features — no makeup or minimal grooming, natural face with slight expression lines that read as experience. They sit alone at a large meeting table or at a clean desk before the workday begins — the space is theirs and nobody else's right now. A laptop is open but the screen is dimmed. In front of them: a leather-bound notebook open to a page with handwritten notes, a few words circled, some arrows. Their hands are folded on the table, or one hand holds a pen resting lightly on the page — mid-thought, not mid-task. Their expression is one of quiet internal focus: the look of someone preparing, not performing. The space reads as [consulting firm / coaching studio / law office / accounting practice] — defined by one strong visual element in the background: a bookshelf dense with titles, a whiteboard with a half-erased framework, or a framed client letter. Morning light enters through a window to the left, long and golden, the room still mostly in shadow. Shot on Sony A7R V, 35mm, f/1.8, warm early morning grade, slight grain. Subject and [notebook / laptop / document] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 😩 Ángulo problema — el cliente antes de pedir ayuda
 
A person, [mid 30s / late 40s], [any ethnicity], sitting at a home or office desk surrounded by the visible symptoms of an unresolved problem. The specific chaos depends on the sub-rubro: for [legal] — printed contracts, highlighted clauses, a letter with an official stamp face-up, a phone with a missed call from an unknown number; for [accounting] — receipts piled in an open folder, a spreadsheet on screen with several red cells visible, a calculator with a half-entered number; for [consulting] — a printed report with conflicting data points circled in different colors, a whiteboard photo on their phone, a coffee cup from yesterday still on the desk; for [coaching] — a journal with several crossed-out entries, a planner open to a blank week. The person holds their head with both hands, elbows on the desk — not dramatic, but unmistakably overwhelmed. Their posture has collapsed inward. The lighting is flat and harsh — overhead fluorescent or a single cool desk lamp, the kind that reveals every problem. Shot on Canon R5, 50mm, f/2.0, desaturated cool grade, no fill. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### ✨ Ángulo aspiracional — el profesional que ya resolvió
 
A confident professional, [late 30s / early 50s], [Mediterranean / Latin American / any ethnicity], seated or standing at a polished but not sterile workspace — a well-organized desk, a bright co-working space, or a clean modern office with plants and natural light. Their posture is open, grounded, unhurried. They hold or rest one hand near a [signed document / printed proposal / tablet showing results / professional portfolio] — the physical evidence of work completed and trusted. The other hand is relaxed. They look directly into camera with the expression of someone who has solved this problem many times before: steady eyes, a slight natural smile, no tension in the jaw. Their clothing is professional and intentional — a fitted blazer over a clean shirt, quality shoes, minimal jewelry. Behind them: a shelf with a few industry titles, one framed credential slightly off-center, a small plant. The light is warm and controlled — soft natural window light mixed with a clean practical lamp. Shot on Fujifilm GFX 100S, 63mm, f/2.8, warm editorial grade, soft highlight roll-off. Subject and [document / device] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🛒 Ángulo urgencia — el momento de contratar
 
A person, [early 30s / late 40s], [any ethnicity], sitting at a desk or kitchen table with a laptop or phone showing a [service landing page / booking calendar / contact form]. Their posture is forward-leaning — both elbows on the surface, face closer to the screen than usual. One hand is on the trackpad or hovering over the keyboard. Their expression is at the precise edge of decision: brows slightly knitted, lips pressed, the look of someone who has waited long enough and knows it. On the desk: a handwritten list of options that has been narrowed down — only one name or option remains uncrossed. A phone face-up with a chat thread or a saved contact. A cold cup of coffee. The lighting is a mix of screen glow and a warm lamp — the room is dim, the screen is the brightest thing. The scene implies a moment that has been building for weeks and is happening right now. Shot on Nikon Z9, 35mm, f/2.0, cool ambient with warm screen glow grade. Subject and screen on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔄 Ángulo transformación — el cliente antes y después, en un solo frame
 
A person, [mid 30s / early 50s], [any ethnicity], photographed at a desk that tells two stories within a single frame. One side of the desk holds the old state: a folder with the problem — a disputed document, a failed report, a crossed-out plan, a printed rejection. The other side holds the new state: a clean [signed agreement / corrected balance sheet / approved proposal / coaching action plan] with a pen resting on top, recently completed. The person faces the new side, posture upright and composed, one hand resting on the completed document — the gesture of someone who has arrived somewhere. Their expression is quietly resolved: not euphoric, but settled. The light comes from the window on the resolved side — the problem side is in softer, receding shadow. The transition is spatial and emotional, not theatrical. Shot on Sony A7IV, 40mm, f/2.2, split warm-cool grade mirroring the two desk sides. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🪟 Ángulo vulnerabilidad — el profesional real
 
A professional, [late 30s / mid 40s], [any ethnicity], sitting alone in their office or studio at an in-between moment — not presenting, not in a meeting, just present. Their jacket is off, draped over the back of the chair. Sleeves slightly rolled. Hair not perfectly set. On the desk: a notebook with a page of crossed-out ideas, a pen set down mid-thought, a phone face-down. They look toward camera — not performing authority, not smiling for an audience. Their expression is honest: the specific look of someone who cares deeply about their work and carries that weight visibly. Not sad, not weak — human. The room around them is real: a bookshelf slightly imperfect, a framed photo slightly crooked, a plant that needs water. The lighting is natural and slightly flat — overcast window light, no artificial warmth added. The humanness is the whole point. Shot on Leica SL2, 50mm APO-Summicron, f/2.0, documentary neutral grade, no retouching. Subject on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌙 Ángulo nocturno — la dedicación que el cliente nunca ve
 
A professional, [late 30s / mid 40s], [any ethnicity], working alone at their desk late at night. The office or home office is dark except for two sources: a warm desk lamp casting a cone of amber light over the work surface, and the cool glow of a laptop screen reflecting faintly on their face. The city or a quiet street is barely visible through a window behind them — dark, still. On the desk: an open [contract with annotations / spreadsheet mid-review / client brief with sticky notes / coaching session notes] — the specific document of their trade, mid-work. A half-drunk glass of water, a pen in hand, a phone showing a late hour. Their posture is still focused — not slumped, not dramatic, but unmistakably deep into something that matters. Their expression is one of quiet, private commitment. This is the work the client benefits from but never sees. Shot on Sony A7III, 50mm, f/1.4, very shallow depth of field, warm amber practical light grade. Subject and work surface on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔬 Ángulo ciencia — el método que genera confianza
 
A sharp professional, [early 40s], [South Asian / Eastern European / any ethnicity], standing or sitting at a clean, organized workspace. Their appearance is precise: fitted shirt or blazer, hair controlled, minimal accessories, reading glasses on or held in one hand. In front of them: a structured document, diagram, or framework — a [legal clause map / financial model / consulting methodology chart / coaching assessment tool] — spread on the desk or displayed on a large monitor. They point at a specific section with one finger, head slightly tilted in explanation or analysis. Their expression is focused and authoritative — not cold, but exact. On the desk: color-coded folders, a legal pad with structured notes, a second monitor with data, a single professional credential or certification frame on the wall behind them, just legible enough to register. The lighting is clean and cool — large window with diffused daylight, no warm tones, clinical precision. Shot on Phase One, 40mm, f/4.0, large softbox diffusion, architectural sharpness. Subject and [document / screen] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👥 Ángulo social proof — la recomendación entre pares
 
Two people, [30s / 40s], [any ethnicities — visibly different], in a professional but relaxed setting: a café, a co-working lounge, or the corridor outside an office. Person A — the recommender — speaks with genuine conviction, leaning slightly toward Person B, one hand gesturing toward a phone showing a [profile / website / document] of the professional or service. Their expression is that specific mix of certainty and enthusiasm that only comes from personal experience. Person B — the listener — leans forward, one elbow on the table or knee, nodding slightly, expression reading as genuine recognition: the look of someone who realizes they've been looking for this. Between them: two coffee cups at different stages, a phone or tablet on the table, a business card or printed one-pager slightly to the side. Neither looks at camera. The conversation is everything. The background is warm and slightly blurred — other professionals in motion, ambient professional life. Shot on Leica M11, 35mm Summilux, f/2.0, candid documentary style, warm afternoon light. Subject and [device / card] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤍 Ángulo minimalismo — autoridad sin ruido
 
A professional, [40s / early 50s], [Scandinavian / Northern features or any neutral-palette ethnicity], standing in a completely uncluttered space — warm white wall with subtle plaster or matte texture, no art, no objects. Their clothing is intentional and restrained: a perfectly fitted dark blazer, a clean white shirt, minimal or no accessories. Their posture is upright and still — not rigid, but certain. They hold a single object in both hands at chest height: a [closed leather portfolio / tablet / folded document / business card] — the only element that names or implies the service. Their expression is completely composed: not smiling, not performing warmth, simply present and certain. A single beam of natural daylight from a narrow off-frame window rakes across the scene at 45 degrees, casting one precise shadow. Everything else in the frame is negative space. Authority communicated through absence. Shot on Hasselblad X2D, 90mm, f/2.8, natural daylight only, ultra-clean grade, maximum negative space. Subject and [object] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👩‍👧 Ángulo generacional — la confianza construida con el tiempo
 
A senior professional, [mid 50s / early 60s], [Mediterranean / Latin American features], seated at a classic but not ostentatious desk — dark wood, a few framed credentials on the wall behind, a bookshelf with decades of accumulated titles. Beside them or across the desk: a younger person, [late 20s / early 30s], clearly a client or a junior colleague, leaning forward with a document or notebook, expression of trust and attentiveness. The senior professional points at something on a shared document — their gesture is practiced, specific, the movement of someone who has explained this a hundred times and still means it. The younger person nods, makes a note. The interaction is real: no performance for camera, no eye contact with lens. The lighting is warm and classic — late afternoon window light mixing with a traditional brass desk lamp. The scene reads as: this person has been here before, and so has their family. Shot on Canon R5, 50mm, f/2.5, warm intimate grade, slight lens diffusion. Subject and [document / desk object] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤲 Ángulo sensorial — la materialidad del trabajo profesional
 
Extreme close-up: a professional's hands at a desk — one hand holds a quality pen, the other steadies a [legal document / financial report / client proposal / printed coaching plan] on a clean surface. The paper is real: slightly warm white, matte finish, visible text in a clean serif font — not fully legible, but clearly professional. The pen nib rests on a signature line or an annotation — the specific moment just before or just after marking something that matters. The fingernails are trimmed and clean, unpolished or with a very natural finish. A slight callus on the inner middle finger from years of writing. The cuff of a fitted shirt or blazer is visible at the wrist edge. The desk surface is dark oak or warm slate, with a faint reflection of the document. The lighting is warm and directional — a soft window light from camera-left, creating subtle shadows in the paper texture and pen grooves. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto strip softbox from camera-left, warm professional grade. Subject and [document] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌍 Ángulo aventura / expansión — el crecimiento como horizonte
 
A professional, [late 30s / early 40s], [Latin American / Southeast Asian / any ethnicity], in a setting that implies scale and movement: a rooftop meeting space, an airport lounge, a modern glass-walled conference room with a city skyline behind them. Their posture is expansive — back straight, one arm extended on the table toward a [laptop showing a growth chart / printed expansion proposal / global map with marked cities]. They look at the material in front of them with the expression of someone who is thinking bigger than the room they're in: focused eyes, slight forward lean, the quiet energy of someone who has outgrown their previous limits. They wear a sharp but mobile outfit — a fitted blazer, no tie, quality leather bag on the chair beside them. On the table: a phone with an international number on screen, a business card from another country, a coffee cup from the location. The background is blurred but implies scale — city, movement, altitude. Shot on Fujifilm X-T5, 23mm, f/2.0, natural outdoor or glass-filtered light grade, slight film emulation. Subject and [document / device] on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
*Prompts optimizados para Gemini Imagen — énfasis en hiperrealismo profesional, gestualidad auténtica y referencia técnica fotográfica.*
*Sub-rubros cubiertos: Consultoría / Agencias — Coaching — Legal — Contable*

## Bebés & Maternidad
 
---
 
### 🪞 Ángulo emocional — el ritual de cuidado
 
A mother, [late 20s / early 30s], [Latin American / Mediterranean] features — natural face, no makeup, hair loosely tied with a few strands fallen at the temples. She kneels on a soft bath mat beside a low changing table or a padded mat on the floor. Her baby, [3–6 months], lies on their back in front of her — awake, calm, making eye contact with her rather than camera. The mother applies [product name] to the baby's skin with both hands — slow, deliberate strokes along the baby's legs and belly, the way someone does something they have done a hundred times and still finds tender. The baby's feet are slightly raised, one tiny hand gripping her index finger without being prompted. The room is warm and dim — morning light filtering through sheer curtains, one small wall lamp on low. On the changing surface: a folded clean cotton onesie, a single wipe, the product within reach. A baby mobile hangs just out of frame, casting a faint shadow. The father or partner is partially visible in the background — seated, watching, present but not central. Warm ivory, blush, and sage tones. Shot on Sony A7R V, 50mm, f/1.8, warm documentary grade, slight grain. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 😩 Ángulo problema — el agotamiento real
 
A parent, [late 20s / early 30s], [any ethnicity] — father, mother, or non-binary parent — sitting on the edge of a bed or a nursing chair at what is clearly an unreasonable hour. Their posture tells everything: shoulders dropped, back slightly curved, eyes carrying the specific heaviness of interrupted sleep for weeks. They hold the baby against their chest — the baby is awake, restless, not yet settled. The parent's free hand reaches toward the [product — cream, soother, sleep aid, wipes] on the nightstand, stretching without fully getting up, the economy of movement of someone running on minimal reserves. The nightstand is real: a phone showing 3:47am, a half-drunk glass of water, a burp cloth slightly damp, the product within reach. The only light is a small warm nightlight and the faint phone screen glow. Their expression is not dramatic despair — it is the specific, honest look of someone doing their absolute best at the hardest possible time. Shot on Canon R5, 50mm, f/2.0, very warm low-light grade, minimal fill, authentic shadows. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### ✨ Ángulo aspiracional — la familia plena
 
A couple, [early 30s], [Mediterranean / Latin American features], with their baby, [8–14 months], in a bright, airy living space — large windows, warm natural light, light oak floors, a few thoughtfully chosen toys visible but not cluttering the space. The baby sits independently on a soft play mat, holding a [product or toy] in both hands, examining it with the focused expression of a small person encountering something new. One parent sits cross-legged on the floor nearby, leaning slightly toward the baby, one hand lightly on their back — present without hovering. The other parent is on the couch just behind, feet tucked up, a coffee mug in hand, watching them both with the relaxed expression of someone who is exactly where they want to be. Nobody looks at camera. The scene radiates the specific contentment of a family that has found its rhythm. The light is warm, diffused, editorial — the kind that makes ordinary Sunday mornings look like everything. Shot on Fujifilm GFX 100S, 63mm, f/2.8, warm editorial grade, soft highlight roll-off. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🛒 Ángulo urgencia — la primera compra
 
A parent, [late 20s], [any ethnicity], standing in a baby products aisle or sitting at a laptop or phone with a product page open — clearly a first-time parent: the expression gives it away. They hold the [product] in one hand, reading the back label with careful attention — brows slightly furrowed, lips moving almost imperceptibly. Their other hand holds a phone showing a search result or a recommendation from a parenting group. In a baby carrier strapped to their chest, a newborn sleeps against them — impossibly small, head resting just below the parent's collarbone, one tiny fist visible. The parent hasn't fully registered the baby's weight anymore — it's already part of them. On the floor beside them: a basket with two or three other products, clearly comparison shopping. Their expression oscillates between overwhelmed and determined: someone who will get this right. Shot on Nikon Z9, 35mm, f/2.0, clean retail or warm home light grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔄 Ángulo transformación — el postparto honesto
 
A mother, [late 20s / early 30s], [any ethnicity], photographed at a bathroom mirror. The scene implies time passed since birth — her body is postpartum real: a slightly soft belly visible under a loose nursing top, hair growing back at the temples, faint dark circles still present but less acute than weeks ago. She looks at her own reflection with an expression that is neither sad nor performing happiness — it is the look of someone in the middle of becoming. In one hand: the [product — postnatal cream, stretch mark oil, nursing balm] at chest height, recently applied, a slight sheen visible on the skin of her collarbone. With her other hand, she touches her own jawline lightly — not fixing anything, just present with herself. Behind her in the mirror's reflection: the edge of a crib, a mobile, a folded muslin cloth on the bathroom shelf. The lighting is natural morning light from a frosted window — honest, not flattering, not harsh. Shot on Leica SL2, 50mm, f/2.0, documentary neutral grade, no retouching, full skin texture preserved. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🪟 Ángulo vulnerabilidad — la maternidad sin filtro
 
A mother, [late 20s / early 30s], [any ethnicity], sitting on the bathroom floor with her back against the bathtub — not because something is wrong, but because this is the only quiet room with a lock. She wears a nursing bra and loose postpartum underwear — real, functional, unstyled. Her hair is unwashed, twisted into a clip that's slightly coming apart. She holds the [product] loosely in both hands in her lap, not yet using it — just holding it, a brief pause inside a relentless day. Her expression is honest and complex: tired, tender, slightly overwhelmed, but not broken. Through the partially open door behind her, the faint sound of a baby is implied — a mobile, a monitor light blinking on the shelf. The bathroom is ordinary and lived-in: a damp towel on the edge of the tub, a nursing pad on the counter, a half-used tube of something near the sink. The lighting is soft and natural — a frosted window, no warmth added. Shot on Leica SL2, 35mm, f/2.0, documentary neutral grade, zero retouching. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌙 Ángulo nocturno — el ritual de la noche
 
A parent, [late 20s / early 30s], [any ethnicity], in a dimly lit nursery at night. The only light: a small warm nightlight in the corner casting a soft amber glow across the room, and the faint light from a baby monitor screen. They stand over a crib or sit in a nursing chair, the baby [2–5 months] cradled against their chest or lying on the changing mat in front of them — drowsy, almost asleep. The parent applies [product — night cream, soothing balm, gentle oil] to the baby's skin with one hand, movements slow and deliberate, the other hand keeping a gentle weight on the baby's belly. The baby's eyes are half-open, heavy. The room around them: a white crib with a muslin swaddle draped over one side, a small shelf with a few board books and a stuffed animal, a humidifier glowing faintly. The parent's expression is one of total present-moment focus — no phone, no distraction, just this. Warm amber, deep ivory, and soft shadow tones throughout. Shot on Sony A7III, 50mm, f/1.4, very shallow depth of field, warm amber practical light grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🔬 Ángulo ciencia — seguro para su piel
 
A parent, [early 30s], [any ethnicity], sitting at a kitchen table in bright natural daylight, the [product] held up at eye level in one hand — tilted slightly so the ingredient label faces camera. Their other hand holds a phone showing a dermatology article or a pediatrician recommendation — the screen partially legible, enough to register as research. Their expression is focused and analytical: the look of someone who has done the homework. They wear a clean, minimal outfit. On the table: a printed list of ingredients to avoid, a highlighter, a second product for comparison placed face-down to the side. The baby is present but peripheral — in a bouncer just off to the side, calm, visible at the edge of frame. The lighting is clean and cool — large window with diffused daylight, clinical clarity. The message is not fear — it is informed confidence. Shot on Phase One, 40mm, f/4.0, large softbox diffusion, clean product photography precision applied to human scene. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👥 Ángulo social proof — lo que se pasa entre madres
 
Two mothers, [late 20s / early 30s], [any ethnicities — visibly different], sitting together at a kitchen table or a park bench, each with a baby or toddler nearby — one in a carrier, one in a stroller just beside the bench, one playing on a blanket on the grass. Mother A reaches into her bag and pulls out the [product], holding it toward Mother B with the specific enthusiasm of someone sharing something that actually worked: arm slightly extended, label toward her friend, one eyebrow raised, a half-smile that says "I know, I know." Mother B leans forward, takes it with both hands, reads the label — her expression is genuine curiosity mixed with the recognition of someone who has been looking for exactly this. Between them on the table or blanket: two takeaway coffee cups, a muslin cloth, a packet of baby snacks half-open. Neither looks at camera. The warmth between them is real. Shot on Leica M11, 35mm Summilux, f/2.0, candid documentary style, warm outdoor afternoon light. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤍 Ángulo minimalismo — solo lo que importa
 
A mother or father, [early 30s], [any ethnicity with light-neutral palette], in a completely uncluttered nursery or bedroom — warm white walls, a single white crib with one folded muslin, natural light from a narrow window. The parent stands or sits beside the crib, the sleeping baby [newborn / 1–2 months] visible inside — impossibly small, one fist near their cheek. The parent holds the [product] in both open upturned palms at chest height — an offering gesture, not a hold. Their expression is completely still: not performing joy, not performing exhaustion. Simply present. Simply certain about this one thing. The product is the only element with distinct color in the entire frame. No clutter, no props, no styling. The silence is the point. Shot on Hasselblad X2D, 90mm, f/2.8, natural daylight only, high-contrast negative space, ultra-clean grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 👩‍👧 Ángulo generacional — lo que aprendimos de nuestras madres
 
Three generations in a warm domestic space: a grandmother, [60s], [Mediterranean / Latin American features] — silver-streaked hair, soft hands with visible veins, the authority of someone who has done this before; her daughter, [early 30s], the new mother — tired but present; and the baby, [2–4 months], lying on a soft blanket between them. The grandmother applies [product] to the baby's skin with practiced ease — her technique specific, her movements automatic, shaped by decades. The mother watches from close beside her, one hand resting near the baby's head, learning or remembering. Their expressions are not posed: the grandmother focused and calm, the mother quietly absorbing, the baby serene under familiar hands. On the surface beside them: a folded cotton cloth, a small bowl of warm water, one other product set aside. The lighting is warm domestic — afternoon window sun mixing with the ambient warmth of a home that has held many babies. Shot on Canon R5, 50mm, f/2.5, warm intimate grade, slight lens diffusion. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🤲 Ángulo sensorial — suavidad que se ve
 
Extreme close-up: an adult hand — large, with visible knuckles, slight dry skin at the wrist that reads as a parent's working hand — applying [product] to a baby's skin. The baby's thigh or upper arm fills most of the frame: the skin is impossibly soft, slightly rosy from warmth, with the faint natural folds of baby fat at the crease. The product — a cream or oil — sits on the skin surface mid-absorption: still slightly shiny, catching warm side light from camera-right, the texture visible between the adult's fingertips as they spread it in slow circles. The scale difference between the adult hand and the baby's limb is the emotional content of the entire image. The background is entirely blurred warm cream — a blanket or sheet, indeterminate. No faces, no staging, no context beyond this one moment of contact. Shot on Canon 100mm macro L, f/2.8, extremely shallow DOF, Profoto strip softbox from camera-right, warm skin grade. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
### 🌍 Ángulo aventura / expansión — el mundo por descubrir
 
A family, [early 30s parents], [Latin American / Southeast Asian features], outdoors in a park, a beach, or an open urban space on a bright morning. Their toddler, [14–24 months], stands or sits on the grass a few feet ahead of them — looking at something just off-frame with the total focused wonder only toddlers have. One parent crouches at the toddler's level, pointing at whatever caught the child's attention, expression matching their wonder. The other parent stands slightly behind, the [product — sunscreen, outdoor toy, stroller, carrier] visible and in active use — not held for camera, but actually being used. The scene is motion and light: the toddler's hair slightly lifted by breeze, the parents' body language open and energized. The background is blurred natural environment — trees, soft sky, movement. The lighting is bright outdoor morning — directional sun, clean shadows, the energy of a day just beginning. Shot on Fujifilm X-T5, 23mm, f/2.0, natural outdoor grade, slight film emulation, warm skin tones preserved. Subject and product on right side only. Left half must remain completely clean for pre-rendered text.
 
---
 
*Prompts optimizados para Gemini Imagen — énfasis en autenticidad familiar, gestualidad real y hiperrealismo emocional.*
*Productos cubiertos: Cuidado del bebé — Maternidad y postparto — Juguetes y estimulación 0–3 — Accesorios y equipamiento*
 
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