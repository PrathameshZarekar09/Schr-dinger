import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path="Schrodinger_Cat_WebXR_Presentation.pptx"):
    prs = Presentation()
    # 16:9 widescreen layout
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Curated Quantum Color Palette
    BG_DARK = RGBColor(6, 9, 17)          # Quantum Void #060911
    CARD_BG = RGBColor(13, 21, 39)        # Deep Card #0D1527
    CARD_BG_ALT = RGBColor(17, 27, 49)    # Elevated Card #111B31
    CARD_BORDER = RGBColor(28, 44, 76)    # Border Navy #1C2C4C
    ACCENT_CYAN = RGBColor(0, 242, 254)   # Quantum Cyan #00F2FE
    ACCENT_PURPLE = RGBColor(168, 85, 247)# Superposition Violet #A855F7
    ACCENT_AMBER = RGBColor(245, 158, 11) # Warning Amber #F59E0B
    ACCENT_GREEN = RGBColor(16, 185, 129) # Live Cat Green #10B981
    ACCENT_RED = RGBColor(239, 68, 68)    # Decay Collapse Red #EF4444
    TEXT_LIGHT = RGBColor(241, 245, 249)  # Slate 100 #F1F5F9
    TEXT_MUTED = RGBColor(148, 163, 184)  # Slate 400 #94A3B8
    TEXT_CYAN = RGBColor(56, 189, 248)    # Sky 400 #38BDF8
    TEXT_PURPLE = RGBColor(216, 180, 254) # Purple 300 #D8B4FE

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, slide_num, category, title, subtitle):
        # Category Tag Badge
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.42), Inches(8.5), Inches(0.32))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = f"SCHRÖDINGER'S CAT WEBXR  •  SLIDE {slide_num}/5  •  {category.upper()}"
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ACCENT_CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.76), Inches(11.7), Inches(0.55))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(21)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_LIGHT

        # Subtitle
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.34), Inches(11.7), Inches(0.35))
        tf_sub = sub_box.text_frame
        tf_sub.word_wrap = True
        tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
        p_sub = tf_sub.paragraphs[0]
        p_sub.text = subtitle
        p_sub.font.size = Pt(11.5)
        p_sub.font.color.rgb = TEXT_MUTED

    def add_footer(slide):
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.08), Inches(11.7), Inches(0.3))
        tf = footer_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = "Schrödinger's Cat: WebXR Quantum Mechanics Simulation  |  Meta Quest 3 & WebGL 2.0  |  Three.js & Web Audio API"
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED

    def create_card(slide, left, top, width, height, title, items, title_color=ACCENT_CYAN, card_bg=CARD_BG, border_color=CARD_BORDER, badge=None):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = card_bg
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)

        tb = slide.shapes.add_textbox(left + Inches(0.22), top + Inches(0.16), width - Inches(0.44), height - Inches(0.30))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Title line
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(12.5)
        p0.font.bold = True
        p0.font.color.rgb = title_color
        p0.space_after = Pt(7)

        if badge:
            run_badge = p0.add_run()
            run_badge.text = f"  [{badge}]"
            run_badge.font.size = Pt(9.5)
            run_badge.font.bold = True
            run_badge.font.color.rgb = ACCENT_PURPLE

        for item in items:
            p = tf.add_paragraph()
            p.space_after = Pt(4.5)
            if isinstance(item, tuple):
                lead = p.add_run()
                lead.text = f"• {item[0]}: "
                lead.font.bold = True
                lead.font.size = Pt(9.8)
                lead.font.color.rgb = TEXT_CYAN

                desc = p.add_run()
                desc.text = item[1]
                desc.font.size = Pt(9.4)
                desc.font.color.rgb = TEXT_LIGHT
            else:
                desc = p.add_run()
                desc.text = f"• {item}"
                desc.font.size = Pt(9.4)
                desc.font.color.rgb = TEXT_LIGHT

    # =========================================================================
    # SLIDE 1: Executive Overview & Project Vision
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)
    add_header(s1, 1, "Executive Overview & Scientific Vision",
               "Schrödinger's Cat: WebXR Quantum Mechanics Simulation",
               "An interactive spatial computing thought experiment exploring quantum superposition and wave-function collapse for Meta Quest 3 & WebGL")
    add_footer(s1)

    # 3 Column Layout for Executive Overview
    col_width = Inches(3.72)
    gap = Inches(0.28)
    top_y = Inches(1.82)
    card_h = Inches(5.05)

    # Column 1: Core Paradox & Scientific Concept
    create_card(s1, Inches(0.8), top_y, col_width, card_h,
                "⚛️ The Quantum Paradox (1935)",
                [
                    ("Erwin Schrödinger's Challenge", "Originally proposed to critique the Copenhagen interpretation by linking microscopic quantum indeterminacy directly to macroscopic observable reality."),
                    ("The Wave Function |Ψ⟩", "In quantum isolation, the unmeasured system exists in a simultaneous superposition: |Ψ⟩ = (1/√2)|Alive, Undecayed⟩ + (1/√2)|Dead, Decayed⟩."),
                    ("The Measurement Problem", "Observation forces the system into an eigenstate. Does physical reality exist prior to measurement, or does conscious observation induce collapse?"),
                    ("Zero-Install Pedagogical Tool", "Transforms abstract quantum theory into a tactile, immersive 3D laboratory experience running seamlessly inside the Meta Quest Browser and desktop WebGL.")
                ],
                title_color=ACCENT_CYAN,
                badge="Theory & Purpose")

    # Column 2: Key Technical & UX Innovations
    create_card(s1, Inches(0.8) + col_width + gap, top_y, col_width, card_h,
                "🚀 Key Architectural Innovations",
                [
                    ("Controller-Free Hand Tracking", "Full optical hand tracking on Meta Quest 3 via WebXR Hand Input API. Pinch to seal, grip to lift lid, and poke 3D tabletop buttons."),
                    ("Bimanual Zoom & Turntable Rotation", "Pinch with two hands to scale entire lab model (0.35x to 2.8x); pinch with one hand to rotate the table 360° smoothly."),
                    ("Quantum Isolation Glass", "Dynamic shader transitioning between frosted opacity (95% opaque in superposition) and transmission clarity (45% clear on collapse)."),
                    ("Cinematic 3D Spatial Screen", "Floating 2K in-world canvas HUD displaying live state changes, mathematical bra-ket notation, and interactive tactile controls."),
                    ("Zero-Asset Audio Synthesis", "Procedural real-time Web Audio API sound engine generating all radiation clicks, strikes, shatters, and hums without media files.")
                ],
                title_color=ACCENT_PURPLE,
                badge="WebXR & Spatial")

    # Column 3: Hardware Pipeline & Performance
    create_card(s1, Inches(0.8) + (col_width + gap) * 2, top_y, col_width, card_h,
                "⚡ Hardware & Rendering Pipeline",
                [
                    ("Target Hardware", "Meta Quest 3 / Quest Pro (Snapdragon XR2 Gen 2, 6DoF optical inside-out tracking) with desktop fallback via OrbitControls."),
                    ("Rendering Engine", "Three.js (r185) WebGL 2.0 pipeline utilizing PCF soft shadow maps, sRGB color grading, and physically based metallic/roughness materials."),
                    ("Locked 72/90 FPS Target", "Carefully optimized scene graph with unified interactive root ('modelRoot') and minimal draw calls for stutter-free VR immersion."),
                    ("Node.js HTTPS & Range Server", "Dual HTTP (port 3000) & HTTPS (port 3443) server with HTTP 206 Partial Content range requests streaming large 3D GLB models seamlessly.")
                ],
                title_color=ACCENT_AMBER,
                badge="Performance")

    # =========================================================================
    # SLIDE 2: Quantum Apparatus & 3D Interactive Components
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, 2, "3D Physical Components & Cascade",
               "The 6 Physical Components & Spatial Chain Reaction",
               "High-fidelity GLTF 3D models orchestrated in a deterministic physical and quantum cascade")
    add_footer(s2)

    # 6 Component Cards (2 rows of 3 columns)
    row_h = Inches(2.40)
    row_gap = Inches(0.24)
    c_w = Inches(3.72)
    c_gap = Inches(0.28)

    # Component 1: Radioactive Atom
    create_card(s2, Inches(0.8), top_y, c_w, row_h,
                "1. Radioactive Atom (RadioactiveAtom.glb)",
                [
                    ("Half-Life Decay Probability", "50% quantum decay threshold governed by the Born rule per observation cycle."),
                    ("Orbital Electron Dynamics", "Animated GLTF mixer loop with continuous harmonic bobbing (y += sin(t*2.0)*0.015)."),
                    ("Spatial Placement", "Floats freely in the shielded left chamber above the Geiger detection cone.")
                ],
                title_color=ACCENT_CYAN)

    # Component 2: Geiger Counter
    create_card(s2, Inches(0.8) + c_w + c_gap, top_y, c_w, row_h,
                "2. Geiger-Müller Detector (Geiger_Counter.glb)",
                [
                    ("Ionization Sensing", "Monitors atomic radiation; triggers needle deflection upon alpha/beta emission."),
                    ("Dynamic Needle Animation", "Deflects from resting 0.05 rad to 1.35 rad peak upon quantum decay event."),
                    ("Flashing Status Light", "Red warning beacon pulse and randomized cosmic background radiation clicks.")
                ],
                title_color=ACCENT_RED)

    # Component 3: Relay Hammer
    create_card(s2, Inches(0.8) + (c_w + c_gap) * 2, top_y, c_w, row_h,
                "3. Relay & Hammer Mechanism (Hammer.glb)",
                [
                    ("Electromagnetic Solenoid", "Spring-loaded mechanical trip activated 280ms after radiation detection."),
                    ("Single-Cycle Clamped Stroke", "Strikes down forcefully toward the poison vial with clamped animation."),
                    ("Acoustic Impact Synthesis", "Triggers metallic clank (320Hz to 45Hz) and 1420Hz resonant ring.")
                ],
                title_color=ACCENT_AMBER)

    # Row 2
    top_y2 = top_y + row_h + row_gap

    # Component 4: Poison Vial
    create_card(s2, Inches(0.8), top_y2, c_w, row_h,
                "4. Hydrocyanic Poison Vial (PoisionVial.glb)",
                [
                    ("Dual-State Geometry", "Instant mesh toggle: intact glass vial disappears, fractured shards appear."),
                    ("Green Emissive Poison Glow", "Point light intensifies from subtle 0.2 to lethal 1.5 intensity upon impact."),
                    ("High-Frequency Glass Burst", "Procedural 3500Hz highpass noise burst with exponential 250ms decay.")
                ],
                title_color=ACCENT_GREEN)

    # Component 5: The Quantum Cat
    create_card(s2, Inches(0.8) + c_w + c_gap, top_y2, c_w, row_h,
                "5. The Quantum Cat (Cat.glb)",
                [
                    ("Procedural Breathing Life", "Chest node pulses via sine wave (2.6Hz, 2% expansion); 3-segment tail sways."),
                    ("Collapsed State Rigging", "Upon lethal collapse, head tilts sideways (rotZ: 0.42, rotX: -0.32) and breathing ceases."),
                    ("Survive State", "Perks up erect, tail wags briskly, accompanied by a procedural cat meow.")
                ],
                title_color=ACCENT_PURPLE)

    # Component 6: Steel Chamber & Lab Table
    create_card(s2, Inches(0.8) + (c_w + c_gap) * 2, top_y2, c_w, row_h,
                "6. Isolation Chamber & Lab Table (Box.glb)",
                [
                    ("Motorized Hinged Lid", "Smooth angular interpolation from open (-1.9 rad) to hermetically sealed (0.0 rad)."),
                    ("Transmission Glass Window", "PBR glass with dynamic opacity (0.45 clear vs. 0.95 frosted superposition)."),
                    ("Heavy Lab Workbench", "4-meter metallic workbench with cyan neon lightstrip and 3 tactile tabletop buttons.")
                ],
                title_color=TEXT_CYAN)

    # =========================================================================
    # SLIDE 3: Natural Hand Tracking & Spatial Gesture Engine
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, 3, "Hand Tracking & Gestural Ergonomics",
               "Controller-Free Natural Hand Tracking & Gesture Engine",
               "Sub-millimeter optical joint tracking powered by WebXR Hand Input API (25 joints per hand)")
    add_footer(s3)

    # 4 Gesture Feature Cards (2x2 Grid)
    grid_w = Inches(5.72)
    grid_gap_x = Inches(0.29)
    grid_h = Inches(2.40)
    grid_gap_y = Inches(0.24)

    # Card 1: Two-Hand Zoom
    create_card(s3, Inches(0.8), top_y, grid_w, grid_h,
                "🔍 Two-Hand Middle Pinch: Bimanual Model Zoom (0.35x – 2.8x)",
                [
                    ("Trigger Condition", "Simultaneous middle-finger-tip and thumb-tip pinch on BOTH hands (<35mm joint distance)."),
                    ("Euclidean Distance Ratio", "Computes dynamic hand span: scaleRatio = currentDist / initialDist applied to modelRoot."),
                    ("Ergonomic Clamp", "Restricts scale safely between 0.35x (miniature overview) and 2.8x (macro inspection of vial and atom)."),
                    ("Visual Feedback Markers", "Emissive violet sphere markers glow cyan at middle fingertips when pinch is engaged.")
                ],
                title_color=ACCENT_CYAN,
                badge="Bimanual Gesture")

    # Card 2: One-Hand Turntable Rotation
    create_card(s3, Inches(0.8) + grid_w + grid_gap_x, top_y, grid_w, grid_h,
                "🔄 One-Hand Middle Pinch: 360° Turntable Model Rotation",
                [
                    ("Trigger Condition", "Middle-finger-tip and thumb-tip pinch with ONE hand only (left or right)."),
                    ("Horizontal Angle Calculation", "Derives angular delta around model center: Δθ = atan2(Xhand - Xcenter, Zhand - Zcenter)."),
                    ("Natural Turntable Feel", "Combines polar angular tracking with horizontal drag delta for 1:1 responsive rotation."),
                    ("Omnidirectional Inspection", "Inspect the radioactive atom, poison hammer, and cat without moving your physical body.")
                ],
                title_color=ACCENT_PURPLE,
                badge="Unimanual Gesture")

    # Card 3: Index Pinch Chamber Manipulation
    create_card(s3, Inches(0.8), top_y + grid_h + grid_gap_y, grid_w, grid_h,
                "🤏 Index Finger Pinch: Direct Chamber Lid Grip & Sealing",
                [
                    ("Trigger Condition", "Index-finger-tip + thumb-tip pinch (<32mm) within 38cm proximity of the box lid handle."),
                    ("Direct Action", "Pinching while open pulls the lid closed to seal the chamber; pinching while closed lifts lid to open."),
                    ("State Transition", "Instantly activates Quantum Superposition upon closure and triggers Observation upon opening."),
                    ("Spherical Visual Feedback", "Index fingertip indicator expands by 1.6x with high-contrast cyan glow during active pinch.")
                ],
                title_color=ACCENT_AMBER,
                badge="Direct Manipulation")

    # Card 4: Spatial Poke & Tabletop Buttons
    create_card(s3, Inches(0.8) + grid_w + grid_gap_x, top_y + grid_h + grid_gap_y, grid_w, grid_h,
                "👆 Spatial Index Poke: Tactile 3D Buttons & Holographic Screen",
                [
                    ("Tactile 3D Buttons", "Proximity collision sphere (14cm threshold) on tabletop buttons: 'Seal Box', 'Observe', and 'Reset'."),
                    ("In-Canvas UV Raycasting", "Direct finger tap or controller ray on the 2K holographic orientation panel triggers buttons."),
                    ("Visual & Audio Feedback", "Generates immediate tactile click audio, button depression, and state panel updates."),
                    ("Quantum Peek Mode", "Toggles X-ray transparency on frosted glass to inspect superposition without collapsing wave function.")
                ],
                title_color=ACCENT_GREEN,
                badge="Spatial Poke & Ray")

    # =========================================================================
    # SLIDE 4: Quantum State Machine & Procedural Web Audio Engine
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, 4, "State Machine & Sound Architecture",
               "Quantum State Machine & Procedural Web Audio Engine",
               "Rigorous 4-stage state lifecycle paired with mathematical real-time audio synthesis")
    add_footer(s4)

    # Split 2-Column Layout
    half_w = Inches(5.72)
    gap_x = Inches(0.29)

    # Column 1: 4-Stage Quantum State Lifecycle
    create_card(s4, Inches(0.8), top_y, half_w, card_h,
                "⚛️ 4-Stage Quantum State Machine",
                [
                    ("1. ORIENTATION STAGE", "Initial educational setup. Open chamber lid, clear glass, explanatory text on holographic screen, and idle apparatus."),
                    ("2. INSPECTION STAGE", "User freely inspects components: examines radioactive atom, pokes Geiger counter, observes living breathing cat, and verifies intact poison vial."),
                    ("3. SUPERPOSITION STAGE (|Ψ⟩)", "Chamber lid seals shut. Front glass turns opaque/frosted (95% opacity). The system enters an unobserved state: |Ψ⟩ = (1/√2)|Alive⟩ + (1/√2)|Dead⟩. Continuous quantum hum commences."),
                    ("4. COLLAPSED STAGE (Wave Function Collapse)", "User or observer opens the lid. 50% Born Rule quantum probability determines branch:"),
                    ("   • Branch A (Atom Decayed - 50%)", "Geiger counter triggers burst -> needle max deflection -> relay hammer strikes (280ms) -> poison vial shatters (480ms) -> cat collapses (620ms) -> poison glow intensifies."),
                    ("   • Branch B (Atom Undecayed - 50%)", "Geiger needle calms -> cheerful cat meow plays -> cat perks up head -> vial remains pristine -> quantum hum terminates cleanly.")
                ],
                title_color=ACCENT_PURPLE,
                badge="Lifecycle Logic")

    # Column 2: Procedural Web Audio Synthesizer
    create_card(s4, Inches(0.8) + half_w + gap_x, top_y, half_w, card_h,
                "🔊 Zero-Asset Procedural Web Audio Synthesizer",
                [
                    ("Zero External Audio Files", "100% mathematical sound synthesis via Web Audio API. Zero bandwidth, instantaneous startup, and zero asset loading failures."),
                    ("Geiger Radiation Click", "3ms impulse noise burst shaped through a narrow bandpass filter (1800Hz - 2400Hz, Q=4.0) with randomized intervals."),
                    ("Decay Particle Burst", "Rapid cascade of 18-26 erratic micro-clicks simulating energetic ionizing particle release during decay."),
                    ("Mechanical Hammer Strike", "Dual-oscillator impact: sawtooth frequency pitch drop (320Hz -> 45Hz) blended with 1420Hz high-frequency metallic ring."),
                    ("Crystalline Vial Shatter", "250ms highpass filtered noise (3500Hz) with sharp exponential decay envelope replicating breaking chemical glass."),
                    ("Procedural Cat Meow", "Triangle wave oscillator with expressive pitch inflection: 440Hz rise -> 680Hz apex -> 520Hz gentle falloff (me-ow)."),
                    ("Superposition Quantum Hum", "Dual sine waves (108Hz fundamental + 216.8Hz detuned harmonic) generating deep binaural beating resonance.")
                ],
                title_color=ACCENT_CYAN,
                badge="Web Audio API")

    # =========================================================================
    # SLIDE 5: Technical Stack, Infrastructure & Scientific Roadmap
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, 5, "Deployment, Security & Future Vision",
               "Software Architecture, Security & Scientific Roadmap",
               "Production-grade WebXR implementation, dual SSL serving infrastructure, and future research directions")
    add_footer(s5)

    # 4 Cards Layout (2x2 Grid)
    create_card(s5, Inches(0.8), top_y, grid_w, grid_h,
                "🛠️ Modern WebXR Technology Stack",
                [
                    ("Three.js (r185) WebGL 2.0", "Custom PBR shading, PCF soft shadows, sRGB gamma workflow, and AnimationMixer orchestration."),
                    ("WebXR Device API", "Full spatial immersive-vr session support, 6DoF local-floor reference spaces, and XRHandModelFactory."),
                    ("Vanilla ES Modules & Vite", "Zero framework bloat; fast modern native ES module imports with clean separation of concerns."),
                    ("Spatial Canvas HUD Pipeline", "Dynamic 2048x1440 canvas rasterization converted to CanvasTexture with live 60FPS UI redraws.")
                ],
                title_color=ACCENT_CYAN,
                badge="Core Tech")

    create_card(s5, Inches(0.8) + grid_w + grid_gap_x, top_y, grid_w, grid_h,
                "🔒 Dual HTTP/HTTPS & Range Streaming Server",
                [
                    ("Dual Server Architecture (server.cjs)", "Simultaneous HTTP (port 3000) for local tools & HTTPS (port 3443) for WebXR production."),
                    ("SSL Security Mandate", "Self-signed SSL certificates (cert.pem, key.pem) required by browsers for spatial camera & hand tracking."),
                    ("HTTP 206 Partial Content", "Range request support streaming heavy GLB binary assets in optimized byte chunks."),
                    ("Cross-Origin Resource Sharing (CORS)", "Configured with wildcard Access-Control-Allow-Origin headers for seamless headset loading.")
                ],
                title_color=ACCENT_AMBER,
                badge="Infrastructure")

    create_card(s5, Inches(0.8), top_y + grid_h + grid_gap_y, grid_w, grid_h,
                "📊 Performance Optimization & Ergonomics",
                [
                    ("Locked 72/90 FPS in VR", "Maintains high VR frame rates on Quest 3 Snapdragon XR2 Gen 2 by minimizing material changes."),
                    ("Hierarchical modelRoot Group", "Single top-level transform enables instantaneous simultaneous rotation and scaling of all 6 components."),
                    ("Untilted Holographic Screen", "Strictly parallel spatial orientation panel prevents motion sickness and text distortion."),
                    ("Zero Latency Interactions", "Audio context pre-warmed on initial pointerdown, preventing audio stutter on first gesture.")
                ],
                title_color=ACCENT_GREEN,
                badge="Optimization")

    create_card(s5, Inches(0.8) + grid_w + grid_gap_x, top_y + grid_h + grid_gap_y, grid_w, grid_h,
                "🔮 Scientific Roadmap & Future Horizons",
                [
                    ("Mixed Reality (MR) Passthrough", "Place the quantum apparatus directly on the user's real physical desk via Quest 3 color passthrough."),
                    ("Many-Worlds Interpretation (MWI)", "Visualizing multiverse bifurcation: user can branch into parallel timelines where cat lives and dies."),
                    ("Quantum Zeno Effect", "Simulate rapid repetitive observation (>20Hz) suppressing decay and freezing atom in ground state."),
                    ("Multi-User Collaborative VR", "WebRTC-synchronized shared laboratory allowing student and professor co-observation.")
                ],
                title_color=ACCENT_PURPLE,
                badge="Future Roadmap")

    # Save presentation
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Schrodinger_Cat_WebXR_Presentation.pptx"
    build_presentation(out_file)
