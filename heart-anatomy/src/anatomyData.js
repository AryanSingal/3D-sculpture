// Teaching copy for every clickable structure, keyed by structureId.
// `group` is used to build the categorized sidebar list in the info panel.

export const anatomyData = {
  // ---- Chambers -----------------------------------------------------------
  rightAtrium: {
    name: "Right Atrium",
    group: "Chambers",
    location:
      "Upper-right chamber (the viewer's left, facing the model), built here from its anterior, lateral, and septal walls, plus the crista terminalis ridge and the small valves of the inferior vena cava and coronary sinus.",
    function:
      "Collects deoxygenated blood returning from the body via the venae cavae and coronary sinus, then pushes it through the tricuspid valve into the right ventricle.",
    connections: "Receives the superior and inferior vena cava and coronary sinus; empties through the tricuspid valve into the right ventricle.",
  },
  leftAtrium: {
    name: "Left Atrium",
    group: "Chambers",
    location:
      "Upper-left chamber (the viewer's right), tucked behind the other chambers closest to the lungs, built from its anterior, lateral, posterior, superior, and septal walls.",
    function:
      "Collects freshly oxygenated blood from the lungs via the pulmonary veins, then pushes it through the mitral valve into the left ventricle.",
    connections: "Receives the four pulmonary veins; empties through the mitral valve into the left ventricle.",
  },
  rightVentricle: {
    name: "Right Ventricle",
    group: "Chambers",
    location:
      "Lower-right chamber forming most of the heart's front surface, built from the walls of its inflow and outflow parts plus the supraventricular crest that separates them.",
    function:
      "Pumps deoxygenated blood through the pulmonary valve into the pulmonary trunk toward the lungs. Its wall is noticeably thinner than the left ventricle's, since it only needs to pump against the lungs' low-pressure circuit.",
    connections: "Receives blood through the tricuspid valve; ejects through the pulmonary valve into the pulmonary trunk.",
  },
  leftVentricle: {
    name: "Left Ventricle",
    group: "Chambers",
    location:
      "Lower-left chamber with by far the thickest muscular wall of the four chambers, built from its anterior, lateral, inferior, septal, and free walls; forms the heart's apex.",
    function:
      "Pumps freshly oxygenated blood through the aortic valve into the aorta and out to the entire body. Its wall is roughly three times thicker than the right ventricle's, since it must generate enough pressure to reach every tissue in the body.",
    connections: "Receives blood through the mitral valve; ejects through the aortic valve into the ascending aorta.",
  },

  // ---- Auricles -------------------------------------------------------------
  rightAuricle: {
    name: "Right Auricle",
    group: "Chambers",
    location: "A small, ridged pouch projecting from the right atrium, lined internally with the comb-like pectinate muscles.",
    function: "A blind extension of the right atrium that adds a small amount of extra volume during atrial filling; not part of the main flow path.",
    connections: "Continuous with the right atrium.",
  },
  leftAuricle: {
    name: "Left Auricle",
    group: "Chambers",
    location: "A small, finger-like pouch projecting from the left atrium, overlying the root of the pulmonary trunk.",
    function: "A blind extension of the left atrium that adds a small amount of extra volume during atrial filling; not part of the main flow path.",
    connections: "Continuous with the left atrium.",
  },

  // ---- Septa ----------------------------------------------------------------
  interventricularSeptum: {
    name: "Interventricular Septum",
    group: "Septa",
    location:
      "The thick muscular wall running down the center of the heart between the two ventricles, with a small membranous patch near its upper edge and the fibrous trigone anchoring it to the valve rings.",
    function:
      "Keeps oxygenated (left) and deoxygenated (right) blood in the ventricles from mixing, so each side can maintain its own pressure. It bulges into the right ventricle, since the left ventricle's pressure is normally much higher.",
    connections: "Shared wall between the left and right ventricles; anchors to the fibrous rings of the mitral, tricuspid, and aortic valves.",
  },
  atrioventricularSeptum: {
    name: "Atrioventricular Septum",
    group: "Septa",
    location: "A small area of fibrous tissue where the atrial and ventricular septa meet, just above the septal leaflet of the tricuspid valve.",
    function: "Separates the right atrium from the left ventricle directly (the only place in the heart these two chambers are adjacent), and carries part of the conduction system.",
    connections: "Borders the right atrium, left ventricle, and the atrioventricular node region of the conduction system.",
  },
  interatrialSeptum: {
    name: "Interatrial Septum",
    group: "Septa",
    location: "The thin wall separating the two atria, containing the oval depression (fossa ovalis) left behind after the fetal foramen ovale closes.",
    function: "Keeps oxygenated (left atrium) and deoxygenated (right atrium) blood from mixing between the two upper chambers.",
    connections: "Shared wall between the left and right atria.",
  },

  // ---- Valves ---------------------------------------------------------------
  tricuspidValve: {
    name: "Tricuspid Valve",
    group: "Valves",
    location: "Between the right atrium and right ventricle, made of anterior, posterior, and septal leaflets attached to a fibrous anulus.",
    function: "Opens to let blood flow from the right atrium into the right ventricle, then closes so it doesn't flow backward when the ventricle contracts. Its leaflets are anchored by chordae tendineae to the right ventricle's papillary muscles.",
    connections: "Between the right atrium and right ventricle; leaflets tethered by chordae tendineae to the right ventricular papillary muscles.",
  },
  mitralValve: {
    name: "Mitral Valve",
    group: "Valves",
    location: "Between the left atrium and left ventricle, with two leaflets attached to a fibrous anulus (shown here with the fibrous ring from the source scan plus reconstructed leaflets, since valve leaflets are too thin to reliably appear in whole-organ scans).",
    function: "Opens to let oxygenated blood flow from the left atrium into the left ventricle, then closes to stop backflow when the ventricle contracts and ejects blood through the aortic valve.",
    connections: "Between the left atrium and left ventricle; leaflets tethered by chordae tendineae to the left ventricular papillary muscles.",
  },
  pulmonaryValve: {
    name: "Pulmonary Valve",
    group: "Valves",
    location: "At the top of the right ventricle's outflow tract, where it meets the pulmonary trunk; made of three cusps (left, right, and posterior) each with a supporting fibrous scallop.",
    function: "A one-way, semilunar valve that opens as the right ventricle contracts and closes to stop blood flowing back from the pulmonary trunk once the ventricle relaxes.",
    connections: "Between the right ventricle's outflow tract and the pulmonary trunk.",
  },
  aorticValve: {
    name: "Aortic Valve",
    group: "Valves",
    location: "At the top of the left ventricle, where it meets the ascending aorta; made of three cusps around a fibrous ring (this model includes the real anterior cusp from the source scan, with the two posterior cusps reconstructed to complete the valve).",
    function: "A one-way, semilunar valve that opens as the left ventricle contracts and closes to stop blood flowing back from the aorta once the ventricle relaxes. The coronary arteries originate just above two of its cusps.",
    connections: "Between the left ventricle's outflow tract and the ascending aorta.",
  },

  // ---- Great vessels ----------------------------------------------------------
  superiorVenaCava: {
    name: "Superior Vena Cava",
    group: "Great vessels",
    location: "A large vein entering the top of the right atrium.",
    function: "Drains deoxygenated blood from the head, neck, and arms into the right atrium.",
    connections: "Empties into the right atrium.",
  },
  inferiorVenaCava: {
    name: "Inferior Vena Cava",
    group: "Great vessels",
    location: "A large vein entering the bottom of the right atrium, guarded by a small crescent-shaped valve.",
    function: "Drains deoxygenated blood from the abdomen, pelvis, and legs into the right atrium.",
    connections: "Empties into the right atrium.",
  },
  pulmonaryTrunk: {
    name: "Pulmonary Trunk",
    group: "Great vessels",
    location: "Rises from the right ventricle's outflow tract and splits into the left and right pulmonary arteries.",
    function: "Carries deoxygenated blood from the right ventricle toward the lungs — the only artery trunk in the body carrying oxygen-poor blood.",
    connections: "Continues from the right ventricle (through the pulmonary valve); branches into the left and right pulmonary arteries.",
  },
  leftPulmonaryArtery: {
    name: "Left Pulmonary Artery",
    group: "Great vessels",
    location: "The left branch of the pulmonary trunk, heading to the left lung.",
    function: "Carries deoxygenated blood to the left lung to pick up oxygen and release carbon dioxide.",
    connections: "Branches from the pulmonary trunk.",
  },
  rightPulmonaryArtery: {
    name: "Right Pulmonary Artery",
    group: "Great vessels",
    location: "The right branch of the pulmonary trunk, heading to the right lung.",
    function: "Carries deoxygenated blood to the right lung to pick up oxygen and release carbon dioxide.",
    connections: "Branches from the pulmonary trunk.",
  },
  pulmonaryVeins: {
    name: "Pulmonary Veins",
    group: "Great vessels",
    location: "Four veins (two from each lung) entering the back of the left atrium; shown here as a representative pair.",
    function: "Return freshly oxygenated blood from the lungs to the left atrium — the only veins in the body carrying oxygen-rich blood.",
    connections: "Empty into the left atrium.",
  },
  ascendingAorta: {
    name: "Ascending Aorta",
    group: "Great vessels",
    location: "Rises from the top of the left ventricle, including the slightly bulged \"bulb\" at its base where the aortic valve sits.",
    function: "Carries freshly oxygenated blood away from the left ventricle before it curves into the aortic arch. The coronary arteries branch off right at its base.",
    connections: "Continues from the left ventricle (through the aortic valve); continues into the aortic arch.",
  },
  aorticArch: {
    name: "Aortic Arch",
    group: "Great vessels",
    location: "The curved segment of the aorta arching up and over the heart, connecting the ascending and descending aorta.",
    function: "Redirects blood flow from straight up to down toward the rest of the body, while giving off the three arteries that supply the head, neck, and arms.",
    connections: "Continues from the ascending aorta; gives off the brachiocephalic trunk, left common carotid, and left subclavian arteries; continues as the descending aorta.",
  },
  brachiocephalicTrunk: {
    name: "Brachiocephalic Trunk",
    group: "Great vessels",
    location: "The first and largest branch off the aortic arch, soon splitting into the right subclavian and right common carotid arteries.",
    function: "Supplies oxygenated blood to the right arm and the right side of the head and neck.",
    connections: "Branches from the aortic arch.",
  },
  leftCommonCarotidArtery: {
    name: "Left Common Carotid Artery",
    group: "Great vessels",
    location: "The second branch off the aortic arch, running up the left side of the neck.",
    function: "Supplies oxygenated blood to the left side of the head and neck, including the brain.",
    connections: "Branches from the aortic arch.",
  },
  leftSubclavianArtery: {
    name: "Left Subclavian Artery",
    group: "Great vessels",
    location: "The third branch off the aortic arch, running out toward the left shoulder.",
    function: "Supplies oxygenated blood to the left arm (and, via its branches, part of the brain and chest wall).",
    connections: "Branches from the aortic arch.",
  },

  // ---- Ventricular interior --------------------------------------------------
  papillaryMusclesLV: {
    name: "Papillary Muscles (Left Ventricle)",
    group: "Ventricular interior",
    location: "Cone-shaped muscle pillars projecting from the left ventricle's inner wall (anterior and posterior groups).",
    function: "Contract with the ventricle wall and, via chordae tendineae, hold the mitral valve's leaflets closed under pressure, keeping them from flipping back into the atrium.",
    connections: "Anchored to the left ventricle wall; connected to the mitral valve leaflets by chordae tendineae.",
  },
  papillaryMusclesRV: {
    name: "Papillary Muscles (Right Ventricle)",
    group: "Ventricular interior",
    location: "Cone-shaped muscle pillars projecting from the right ventricle's inner wall (anterior, posterior, and septal groups).",
    function: "Contract with the ventricle wall and, via chordae tendineae, hold the tricuspid valve's leaflets closed under pressure, keeping them from flipping back into the atrium.",
    connections: "Anchored to the right ventricle wall; connected to the tricuspid valve leaflets by chordae tendineae.",
  },
  trabeculaeCarneae: {
    name: "Trabeculae Carneae",
    group: "Ventricular interior",
    location: "Irregular ridges of muscle lining the inside of the right ventricle, including the septomarginal trabecula (moderator band) that crosses the cavity to the anterior papillary muscle.",
    function: "Ridge the ventricular wall's inner surface, and the moderator band also carries part of the electrical conduction system straight to the papillary muscle, helping the ventricle contract together.",
    connections: "Line the right ventricle's inner wall; the moderator band bridges the septum to the anterior papillary muscle.",
  },
  chordaeTendineae: {
    name: "Chordae Tendineae",
    group: "Ventricular interior",
    location: "Thin, tendon-like cords running from the tips of the papillary muscles up to the edges of the mitral and tricuspid valve leaflets (reconstructed here, since they are far too fine to appear in a whole-organ scan).",
    function: "Act like the guy-lines on a tent, preventing the AV valve leaflets from being pushed too far back into the atria when ventricular pressure spikes during contraction.",
    connections: "Run from the papillary muscles to the free edges of the tricuspid and mitral valve leaflets.",
  },

  // ---- Coronary vasculature ---------------------------------------------------
  coronaryArteries: {
    name: "Coronary Arteries",
    group: "Coronary vasculature",
    location: "Branch off the aorta just above the aortic valve and run over the heart's surface in the coronary sulcus and interventricular grooves; this model includes the left and right coronary trunks and their major named branches.",
    function: "Supply the heart's own muscle (the myocardium) with oxygenated blood — the heart cannot feed itself from the blood passing through its chambers.",
    connections: "Branch from the root of the aorta; drain via the cardiac veins into the coronary sinus.",
  },
  coronaryVeins: {
    name: "Coronary Veins",
    group: "Coronary vasculature",
    location: "Run alongside the coronary arteries over the heart's surface and converge into the coronary sinus on the back of the heart.",
    function: "Drain deoxygenated blood from the heart muscle back into the right atrium via the coronary sinus.",
    connections: "Collect from the myocardium; the coronary sinus empties into the right atrium.",
  },

  // ---- Conduction system -------------------------------------------------------
  conductionSystem: {
    name: "Cardiac Conduction System",
    group: "Conduction system",
    location: "A network of specialized electrical tissue including the sinoatrial node region, internodal tracts, atrioventricular node, and the atrioventricular bundle running down toward the ventricles.",
    function: "Generates and conducts the electrical signal that triggers each heartbeat — starting at the sinoatrial node, spreading across the atria, pausing briefly at the atrioventricular node, then racing down to make the ventricles contract in a coordinated wave.",
    connections: "Runs from the right atrium (near the SVC) through the atrioventricular node to the ventricular septum, ultimately reaching the papillary muscles via the moderator band.",
  },
};

// Sidebar grouping, in the order sections should appear.
export const structureGroups = [
  { title: "Chambers", ids: ["rightAtrium", "leftAtrium", "rightVentricle", "leftVentricle", "rightAuricle", "leftAuricle"] },
  { title: "Septa", ids: ["interventricularSeptum", "atrioventricularSeptum", "interatrialSeptum"] },
  { title: "Valves", ids: ["tricuspidValve", "mitralValve", "pulmonaryValve", "aorticValve"] },
  {
    title: "Great vessels",
    ids: [
      "superiorVenaCava",
      "inferiorVenaCava",
      "pulmonaryTrunk",
      "leftPulmonaryArtery",
      "rightPulmonaryArtery",
      "pulmonaryVeins",
      "ascendingAorta",
      "aorticArch",
      "brachiocephalicTrunk",
      "leftCommonCarotidArtery",
      "leftSubclavianArtery",
    ],
  },
  { title: "Ventricular interior", ids: ["papillaryMusclesLV", "papillaryMusclesRV", "trabeculaeCarneae", "chordaeTendineae"] },
  { title: "Coronary vasculature", ids: ["coronaryArteries", "coronaryVeins"] },
  { title: "Conduction system", ids: ["conductionSystem"] },
];

export const structureOrder = structureGroups.flatMap((g) => g.ids);
