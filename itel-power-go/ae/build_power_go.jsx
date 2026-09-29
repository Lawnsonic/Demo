/*  itel Energy | POWER GO | IESS-320T
    20 second product spot, built as a fully editable After Effects project.

    HOW TO RUN
    File > Scripts > Run Script File...  and pick this file.
    Keep the folder layout from the package (footage/, audio/ next to this script).
    Install fonts/Montserrat-ExtraBold.ttf first, or change CONFIG.font.

    EVERYTHING IS LIVE
    Every shot is a layer with named keyframes, every caption is a real text
    layer, the logo is vector shapes + text, numbers count up via expressions,
    and scene markers sit on the main comp timeline. Tweak CONFIG below and
    re-run to rebuild, or edit the comp directly.
*/

(function () {

    var CONFIG = {
        compName: "POWER_GO_Main_20s",
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 20,

        font: "Montserrat-ExtraBold",
        red: [228 / 255, 3 / 255, 46 / 255],
        ink: [26 / 255, 26 / 255, 26 / 255],
        white: [1, 1, 1],
        black: [0, 0, 0],
        vignette: [236 / 255, 236 / 255, 238 / 255],

        // On-screen copy. The box prints the model as IESS-320T.
        txtPowerGo: "POWER GO",
        txtCapacity: 100000,
        txtCapacityUnit: "mAh",
        txtWatts: 130,
        txtWattsUnit: "W",
        txtPower: "POWER.",
        txtSimplified: "SIMPLIFIED.",
        txtModel: "IESS-320T",
        txtBrandItel: "itel",
        txtBrandEnergy: "Energy",
        captionY: 1000,

        files: {
            hero: "footage/product_front_hero.png",   // 2048x2048, product centered
            box: "footage/box_studio.png",            // 1376x768, box centered
            handle: "footage/handle_macro.png",       // 1376x768, strap macro
            click: "audio/sfx_click.wav",
            music: "audio/music_pulse.wav"
        },

        // Image-space anchors (pixels inside each still) used for the macro cuts.
        heroCenter: [1024, 1024],
        heroLogo: [1022, 1232],
        boxCenter: [791, 420],
        boxSpec: [1030, 212],
        boxEnergy: [552, 212],
        handleCenter: [688, 384]
    };

    // ------------------------------------------------------------------ helpers

    var ROOT = File($.fileName).parent;

    function importFootage(rel) {
        var f = new File(ROOT.fsName + "/" + rel);
        if (!f.exists) {
            alert("Missing file: " + f.fsName + "\nKeep the package folder layout intact.");
            return null;
        }
        return app.project.importFile(new ImportOptions(f));
    }

    function easeCount(prop) {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) return 1;
        if (t === PropertyValueType.TwoD) return 2;
        if (t === PropertyValueType.ThreeD) return 3;
        return 1;
    }

    // keys: [[time, value], ...]; influence 0..100 (higher = softer, more "luxury")
    function animate(prop, keys, influence) {
        var inf = influence === undefined ? 75 : influence;
        for (var i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], keys[i][1]);
        var n = easeCount(prop);
        for (var k = 1; k <= prop.numKeys; k++) {
            var e = [];
            for (var d = 0; d < n; d++) e.push(new KeyframeEase(0, inf));
            prop.setTemporalEaseAtKey(k, e, e);
        }
    }

    function tr(layer, name) {
        return layer.property("ADBE Transform Group").property(name);
    }

    function span(layer, tIn, tOut) {
        layer.inPoint = tIn;
        layer.outPoint = tOut;
    }

    function ellipseShape(cx, cy, rx, ry) {
        var k = 0.5523;
        var s = new Shape();
        s.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
        s.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]];
        s.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]];
        s.closed = true;
        return s;
    }

    function addMask(layer, shape, feather, inverted) {
        var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        m.property("ADBE Mask Shape").setValue(shape);
        m.property("ADBE Mask Feather").setValue([feather, feather]);
        m.inverted = !!inverted;
        return m;
    }

    function makeText(comp, str, size, color, pos, tracking) {
        var l = comp.layers.addText(str);
        var st = l.property("ADBE Text Properties").property("ADBE Text Document");
        var td = st.value;
        try { td.resetCharStyle(); } catch (e) {}
        td.font = CONFIG.font;
        td.fontSize = size;
        td.applyFill = true;
        td.fillColor = color;
        td.applyStroke = false;
        td.tracking = tracking || 0;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        st.setValue(td);
        tr(l, "ADBE Position").setValue(pos);
        return l;
    }

    // Letter-by-letter "evolve": characters resolve from wide tracking + blur-free fade.
    function addEvolve(layer, t0, t1, extraTracking) {
        var anims = layer.property("ADBE Text Properties").property("ADBE Text Animators");
        var a = anims.addProperty("ADBE Text Animator");
        a.name = "Evolve In";
        var props = a.property("ADBE Text Animator Properties");
        props.addProperty("ADBE Text Opacity").setValue(0);
        props.addProperty("ADBE Text Tracking Amount").setValue(extraTracking === undefined ? 40 : extraTracking);
        var sel = a.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        try {
            sel.property("ADBE Text Range Advanced").property("ADBE Text Range Shape").setValue(2); // ramp up
        } catch (e) {}
        animate(sel.property("ADBE Text Percent Start"), [[t0, 0], [t1, 100]], 80);
        return a;
    }

    function addSkew(layer, amount) {
        var anims = layer.property("ADBE Text Properties").property("ADBE Text Animators");
        var a = anims.addProperty("ADBE Text Animator");
        a.name = "Italic Skew";
        a.property("ADBE Text Animator Properties").addProperty("ADBE Text Skew").setValue(amount);
        a.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    }

    function fade(layer, tIn, inDur, tOut, outDur) {
        var op = tr(layer, "ADBE Opacity");
        var k = [[tIn, 0], [tIn + inDur, 100]];
        if (tOut !== undefined) { k.push([tOut - outDur, 100]); k.push([tOut, 0]); }
        animate(op, k, 70);
    }

    // Thin brand-red "charge line" that fills left to right (the small evolution motif).
    function chargeLine(comp, name, y, w, t0, t1) {
        var l = comp.layers.addShape();
        l.name = name;
        var g = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var c = g.property("ADBE Vectors Group");
        var r = c.addProperty("ADBE Vector Shape - Rect");
        r.property("ADBE Vector Rect Size").setValue([w, 5]);
        r.property("ADBE Vector Rect Roundness").setValue(3);
        c.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(CONFIG.red.concat([1]));
        tr(l, "ADBE Anchor Point").setValue([-w / 2, 0]);
        tr(l, "ADBE Position").setValue([CONFIG.width / 2 - w / 2, y]);
        animate(tr(l, "ADBE Scale"), [[t0, [0, 100]], [t1, [100, 100]]], 85);
        return l;
    }

    // ------------------------------------------------------------------ build

    app.beginUndoGroup("Build itel POWER GO spot");

    var folder = app.project.items.addFolder("itel POWER GO");
    var W = CONFIG.width, H = CONFIG.height, D = CONFIG.duration;

    var heroItem = importFootage(CONFIG.files.hero);
    var boxItem = importFootage(CONFIG.files.box);
    var handleItem = importFootage(CONFIG.files.handle);
    var clickItem = importFootage(CONFIG.files.click);
    var musicItem = importFootage(CONFIG.files.music);
    if (!heroItem || !boxItem || !handleItem) { app.endUndoGroup(); return; }
    var items = [heroItem, boxItem, handleItem, clickItem, musicItem];
    for (var ii = 0; ii < items.length; ii++) if (items[ii]) items[ii].parentFolder = folder;

    // ---- Logo precomp (vector, recolorable)
    var logo = app.project.items.addComp("LOGO_itel_Energy", 1400, 420, 1, D, CONFIG.fps);
    logo.parentFolder = folder;

    var bubble = logo.layers.addShape();
    bubble.name = "itel Bubble";
    var bg = bubble.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var bc = bg.property("ADBE Vectors Group");
    bc.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([400, 230]);
    var tail = bc.addProperty("ADBE Vector Shape - Group");
    var ts = new Shape();
    ts.vertices = [[-150, 60], [-190, 128], [-95, 95]];
    ts.closed = true;
    tail.property("ADBE Vector Shape").setValue(ts);
    bc.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(CONFIG.red.concat([1]));
    tr(bubble, "ADBE Position").setValue([250, 210]);

    var itelTxt = makeText(logo, CONFIG.txtBrandItel, 150, CONFIG.white, [250, 262], -10);
    itelTxt.name = "itel Wordmark";
    var energyTxt = makeText(logo, CONFIG.txtBrandEnergy, 190, CONFIG.red, [900, 278], 0);
    energyTxt.name = "Energy Wordmark";
    addSkew(energyTxt, 12);

    // ---- Main comp
    var comp = app.project.items.addComp(CONFIG.compName, W, H, 1, D, CONFIG.fps);
    comp.parentFolder = folder;
    comp.bgColor = CONFIG.white;

    var markers = [
        [0, "01 Black + logo"], [2, "02 Box from darkness / POWER GO"],
        [5, "03 Hero reveal / 100,000mAh"], [8, "04 Light sweep / 130W"],
        [11, "05 Macro cuts / POWER. SIMPLIFIED."], [14, "06 Settle / IESS-320T"],
        [17, "07 Fade to white / end logo"]
    ];
    for (var mi = 0; mi < markers.length; mi++) {
        comp.markerProperty.setValueAtTime(markers[mi][0], new MarkerValue(markers[mi][1]));
    }

    // Layers are added bottom-up: each addX puts the new layer on top.

    var bgWhite = comp.layers.addSolid(CONFIG.white, "BG White", W, H, 1, D);
    bgWhite.locked = true;

    // Soft grey edge that "expands into pure white" at 14s
    var vig = comp.layers.addSolid(CONFIG.vignette, "BG Soft Edge (expands out at 14s)", W, H, 1, D);
    var vm = addMask(vig, ellipseShape(W / 2, H / 2, 820, 520), 420, true);
    animate(vm.property("ADBE Mask Offset"), [[14.0, 0], [15.4, 900]], 80);
    span(vig, 5.0, 17.0);

    // ---- 02  Box emerges (2 to 5)
    var box = comp.layers.add(boxItem);
    box.name = "S02 Box Hero";
    box.blendingMode = BlendingMode.MULTIPLY;
    tr(box, "ADBE Anchor Point").setValue(CONFIG.boxCenter);
    tr(box, "ADBE Position").setValue([W / 2, 500]);
    animate(tr(box, "ADBE Scale"), [[2.0, [112, 112]], [5.0, [124, 124]]], 60); // the one controlled camera move
    span(box, 2.0, 5.0);

    var dark = comp.layers.addSolid(CONFIG.black, "S02 Darkness (lights up)", W, H, 1, D);
    var dm = addMask(dark, ellipseShape(W / 2, 500, 260, 320), 300, true);
    animate(dm.property("ADBE Mask Offset"), [[2.0, -300], [3.8, 900]], 70);
    animate(tr(dark, "ADBE Opacity"), [[2.0, 100], [3.8, 0]], 70);
    span(dark, 2.0, 4.0);

    var tPowerGo = makeText(comp, CONFIG.txtPowerGo, 64, CONFIG.red, [W / 2, CONFIG.captionY], 120);
    tPowerGo.name = "TXT POWER GO";
    addEvolve(tPowerGo, 3.3, 4.2, 80);
    fade(tPowerGo, 3.3, 0.01, 5.0, 0.25);
    span(tPowerGo, 3.3, 5.0);

    // ---- 03 / 04  Hero reveal, rotation, light sweep (5 to 9.5)
    var hero = comp.layers.add(heroItem);
    hero.name = "S03-04 Hero Product (3D)";
    hero.blendingMode = BlendingMode.MULTIPLY;
    hero.threeDLayer = true;
    tr(hero, "ADBE Anchor Point").setValue(CONFIG.heroCenter.concat([0]));
    // Start tight on the body (handle above frame), pull back so the handle glides in
    animate(tr(hero, "ADBE Position"), [[5.0, [W / 2, 480, 0]], [7.4, [W / 2, 548, 0]], [9.5, [W / 2, 540, 0]]], 75);
    animate(tr(hero, "ADBE Scale"), [[5.0, [90, 90, 90]], [7.4, [53, 53, 53]], [9.5, [55, 55, 55]]], 75);
    animate(tr(hero, "ADBE Rotate Y"), [[5.0, -10], [7.6, 3], [9.5, 0]], 70);
    span(hero, 5.0, 9.5);
    try {
        var sweep = hero.property("ADBE Effect Parade").addProperty("CC Light Sweep");
        sweep.property("Direction").setValue(-25);
        sweep.property("Width").setValue(140);
        sweep.property("Sweep Intensity").setValue(70);
        sweep.property("Edge Intensity").setValue(60);
        animate(sweep.property("Center"), [[8.0, [-300, 1024]], [9.4, [2350, 1024]]], 55);
    } catch (e) {
        // CC Light Sweep ships with AE; if missing, the rest of the build still works.
    }

    var tCap = makeText(comp, "0" + CONFIG.txtCapacityUnit, 64, CONFIG.ink, [W / 2, CONFIG.captionY], 40);
    tCap.name = "TXT 100,000mAh (count-up)";
    tCap.property("ADBE Text Properties").property("ADBE Text Document").expression =
        "var v = " + CONFIG.txtCapacity + ", unit = '" + CONFIG.txtCapacityUnit + "';\n" +
        "var n = Math.round(v * ease(time, inPoint + 0.1, inPoint + 1.3, 0, 1));\n" +
        "n.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',') + unit;";
    fade(tCap, 5.6, 0.3, 8.0, 0.25);
    span(tCap, 5.6, 8.0);

    // ---- 04  Cut to the power rating on the box (9.5 to 11)
    var spec = comp.layers.add(boxItem);
    spec.name = "S04 Box Spec Close-up";
    spec.blendingMode = BlendingMode.MULTIPLY;
    tr(spec, "ADBE Anchor Point").setValue(CONFIG.boxSpec);
    tr(spec, "ADBE Position").setValue([W / 2, 470]);
    animate(tr(spec, "ADBE Scale"), [[9.5, [330, 330]], [11.0, [352, 352]]], 50);
    span(spec, 9.5, 11.0);

    var tW = makeText(comp, "0" + CONFIG.txtWattsUnit, 120, CONFIG.red, [W / 2, CONFIG.captionY], 20);
    tW.name = "TXT 130W (count-up)";
    tW.property("ADBE Text Properties").property("ADBE Text Document").expression =
        "Math.round(" + CONFIG.txtWatts + " * ease(time, inPoint, inPoint + 0.8, 0, 1)) + '" + CONFIG.txtWattsUnit + "';";
    fade(tW, 9.6, 0.2, 11.0, 0.1);
    span(tW, 9.6, 11.0);

    // ---- 05  Macro cuts, 0.75s each (11 to 14)
    var m1 = comp.layers.add(heroItem);
    m1.name = "S05a Macro itel Mark";
    m1.blendingMode = BlendingMode.MULTIPLY;
    tr(m1, "ADBE Anchor Point").setValue(CONFIG.heroLogo);
    tr(m1, "ADBE Position").setValue([W / 2, 470]);
    animate(tr(m1, "ADBE Scale"), [[11.0, [250, 250]], [11.75, [266, 266]]], 40);
    span(m1, 11.0, 11.75);

    var m2 = comp.layers.add(boxItem);
    m2.name = "S05b Macro Energy Branding";
    m2.blendingMode = BlendingMode.MULTIPLY;
    tr(m2, "ADBE Anchor Point").setValue(CONFIG.boxEnergy);
    tr(m2, "ADBE Position").setValue([W / 2, 470]);
    animate(tr(m2, "ADBE Scale"), [[11.75, [380, 380]], [12.5, [400, 400]]], 40);
    span(m2, 11.75, 12.5);

    var m3 = comp.layers.add(handleItem);
    m3.name = "S05c Macro Handle";
    m3.blendingMode = BlendingMode.MULTIPLY;
    tr(m3, "ADBE Anchor Point").setValue(CONFIG.handleCenter);
    tr(m3, "ADBE Position").setValue([W / 2, H / 2]);
    animate(tr(m3, "ADBE Scale"), [[12.5, [141, 141]], [13.25, [150, 150]]], 40);
    span(m3, 12.5, 13.25);

    var m4 = comp.layers.add(heroItem);
    m4.name = "S05d Full Power Station";
    m4.blendingMode = BlendingMode.MULTIPLY;
    tr(m4, "ADBE Anchor Point").setValue(CONFIG.heroCenter);
    tr(m4, "ADBE Position").setValue([W / 2, 520]);
    animate(tr(m4, "ADBE Scale"), [[13.25, [46, 46]], [14.0, [49, 49]]], 40);
    span(m4, 13.25, 14.0);

    var tPow = makeText(comp, CONFIG.txtPower, 60, CONFIG.ink, [W / 2, CONFIG.captionY - 40], 60);
    tPow.name = "TXT POWER.";
    addEvolve(tPow, 11.15, 11.6, 60);
    span(tPow, 11.15, 14.0);

    var tSimp = makeText(comp, CONFIG.txtSimplified, 60, CONFIG.red, [W / 2, CONFIG.captionY + 36], 60);
    tSimp.name = "TXT SIMPLIFIED.";
    addEvolve(tSimp, 12.4, 12.95, 60);
    span(tSimp, 12.4, 14.0);

    // ---- 06  Settle in perfect center (14 to 17.8)
    var settle = comp.layers.add(heroItem);
    settle.name = "S06 Hero Settle";
    settle.blendingMode = BlendingMode.MULTIPLY;
    tr(settle, "ADBE Anchor Point").setValue(CONFIG.heroCenter);
    tr(settle, "ADBE Position").setValue([W / 2, 510]);
    animate(tr(settle, "ADBE Scale"), [[14.0, [58, 58]], [15.2, [47.6, 47.6]], [16.0, [48, 48]], [17.8, [47, 47]]], 85);
    span(settle, 14.0, 17.8);

    var tModel = makeText(comp, CONFIG.txtModel, 58, CONFIG.ink, [W / 2, CONFIG.captionY + 10], 200);
    tModel.name = "TXT IESS-320T";
    addEvolve(tModel, 14.6, 15.4, 120);
    fade(tModel, 14.6, 0.01, 17.0, 0.4);
    span(tModel, 14.6, 17.0);

    // ---- 07  Fade to white, end logo (17 to 20)
    var toWhite = comp.layers.addSolid(CONFIG.white, "S07 Fade to White", W, H, 1, D);
    animate(tr(toWhite, "ADBE Opacity"), [[17.0, 0], [17.8, 100]], 70);
    span(toWhite, 17.0, 20.0);

    var endLogo = comp.layers.add(logo);
    endLogo.name = "S07 End Logo";
    tr(endLogo, "ADBE Position").setValue([W / 2, 500]);
    animate(tr(endLogo, "ADBE Scale"), [[17.9, [62, 62]], [18.7, [66, 66]]], 85);
    fade(endLogo, 17.9, 0.6);
    span(endLogo, 17.9, 20.0);

    var tEnd = makeText(comp, CONFIG.txtPowerGo, 46, CONFIG.ink, [W / 2, 690], 180);
    tEnd.name = "TXT End POWER GO";
    addEvolve(tEnd, 18.8, 19.4, 100);
    span(tEnd, 18.8, 20.0);

    var endLine = chargeLine(comp, "S07 Charge Line", 730, 360, 18.9, 19.7);
    span(endLine, 18.9, 20.0);

    // ---- 01  Black open with logo (0 to 2), on top of everything
    var openBlack = comp.layers.addSolid(CONFIG.black, "S01 Black", W, H, 1, D);
    span(openBlack, 0, 2.0);
    var openLogo = comp.layers.add(logo);
    openLogo.name = "S01 Open Logo";
    tr(openLogo, "ADBE Position").setValue([W / 2, H / 2]);
    animate(tr(openLogo, "ADBE Scale"), [[0.35, [60, 60]], [1.9, [64, 64]]], 80);
    fade(openLogo, 0.35, 0.8, 2.0, 0.3);
    span(openLogo, 0.35, 2.0);
    var openLine = chargeLine(comp, "S01 Charge Line", 700, 300, 0.7, 1.6);
    fade(openLine, 0.7, 0.01, 2.0, 0.3);
    span(openLine, 0.7, 2.0);

    // ---- Audio
    if (clickItem) {
        var c1 = comp.layers.add(clickItem);
        c1.name = "SFX Click (open)";
        c1.startTime = 0.3;
        var c2 = comp.layers.add(clickItem);
        c2.name = "SFX Click (final)";
        c2.startTime = 18.6;
    }
    if (musicItem) {
        var mus = comp.layers.add(musicItem);
        mus.name = "MUSIC Pulse (starts 8.5s, drops 14s)";
        mus.startTime = 0;
        // Level keys mirror the drop so it can be reshaped without re-exporting audio.
        animate(mus.property("ADBE Audio Group").property("ADBE Audio Levels"),
            [[13.8, [0, 0]], [14.1, [-48, -48]], [16.3, [-48, -48]], [16.8, [-6, -6]]], 50);
    }

    comp.workAreaStart = 0;
    comp.workAreaDuration = D;
    comp.openInViewer();

    app.endUndoGroup();
})();
