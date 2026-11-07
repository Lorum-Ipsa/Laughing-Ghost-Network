/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  if (!users.fields.getByName('moderator')) users.fields.add(new BoolField({ name: 'moderator' }));
  users.createRule = "@request.body.moderator:isset = false || @request.body.moderator = false";
  users.updateRule = "(id = @request.auth.id && @request.body.moderator:changed = false) || @request.auth.moderator = true";
  app.save(users);
  const dates = [{ name: 'created', type: 'autodate', onCreate: true }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }];
  function ensure(name, config) {
    try { return app.findCollectionByNameOrId(name); } catch (_) {
      const c = new Collection({ name, type: 'base', ...config, fields: [...config.fields, ...dates] });
      app.save(c); return c;
    }
  }
  const profiles = ensure('ghost_profiles', {
    listRule: '', viewRule: '',
    createRule: "@request.auth.id != '' && owner = @request.auth.id && example = false",
    updateRule: "@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:changed = false && @request.body.handle:changed = false && @request.body.example:changed = false",
    deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
    fields: [
      { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: 'handle', type: 'text', required: true, min: 3, max: 40, pattern: '^[a-z0-9_-]+$' },
      { name: 'specialties', type: 'text', max: 250 },
      { name: 'bio', type: 'text', max: 2000 },
      { name: 'portfolio', type: 'url' },
      { name: 'example', type: 'bool' }
    ], indexes: ['CREATE UNIQUE INDEX idx_ghost_handle ON ghost_profiles (handle)', "CREATE UNIQUE INDEX idx_ghost_owner ON ghost_profiles (owner) WHERE owner != ''"]
  });
  const work = ensure('ghost_work', {
    listRule: "status = 'published' || (@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true",
    viewRule: "status = 'published' || (@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true",
    createRule: "@request.auth.id != '' && owner = @request.auth.id && author.owner = @request.auth.id && status = 'submitted' && example = false",
    updateRule: "@request.auth.moderator = true || (@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:changed = false && @request.body.author:changed = false && @request.body.example:changed = false && (status != 'published' && @request.body.status = 'submitted'))",
    deleteRule: "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true",
    fields: [
      { name: 'owner', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: 'author', type: 'relation', collectionId: profiles.id, required: true, maxSelect: 1 },
      { name: 'title', type: 'text', required: true, max: 180 },
      { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['research', 'detection', 'tool', 'writeup', 'project', 'exercise'] },
      { name: 'summary', type: 'text', required: true, max: 500 },
      { name: 'body', type: 'text', required: true, max: 50000 },
      { name: 'tags', type: 'text', max: 250 },
      { name: 'source', type: 'url' },
      { name: 'code', type: 'text', max: 50000 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['submitted', 'published', 'rejected'] },
      { name: 'example', type: 'bool' }
    ]
  });
  ensure('ghost_applications', {
    listRule: "owner = @request.auth.id || @request.auth.moderator = true", viewRule: "owner = @request.auth.id || @request.auth.moderator = true",
    createRule: "@request.auth.id != '' && owner = @request.auth.id && status = 'pending' && consent = true",
    updateRule: "@request.auth.moderator = true", deleteRule: "owner = @request.auth.id",
    fields: [
      { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
      { name: 'handle', type: 'text', required: true, max: 40 },
      { name: 'specialties', type: 'text', required: true, max: 250 },
      { name: 'portfolio', type: 'url', required: true },
      { name: 'motivation', type: 'text', required: true, max: 3000 },
      { name: 'consent', type: 'bool', required: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'accepted', 'declined'] }
    ], indexes: ['CREATE UNIQUE INDEX idx_ghost_application_owner ON ghost_applications (owner)']
  });
  ensure('ghost_participations', {
    listRule: "owner = @request.auth.id || @request.auth.moderator = true", viewRule: "owner = @request.auth.id || @request.auth.moderator = true",
    createRule: "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published' && (work.kind = 'project' || work.kind = 'exercise')",
    updateRule: null, deleteRule: "owner = @request.auth.id",
    fields: [
      { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
      { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
      { name: 'message', type: 'text', required: true, max: 2000 }
    ], indexes: ['CREATE UNIQUE INDEX idx_ghost_participation ON ghost_participations (owner, work)']
  });
  const samples = [
    { handle: 'nullspectre', specialties: 'Detection Engineering, Threat Hunting', bio: 'Profil de démonstration. Spécialités : détection comportementale, télémétrie Windows et validation de règles Sigma.' },
    { handle: 'quietbyte', specialties: 'Cloud Security, Security Research', bio: 'Profil de démonstration. Spécialités : identités cloud, permissions minimales et analyse des journaux d’audit.' },
    { handle: 'echo_zero', specialties: 'DFIR, Reverse Engineering', bio: 'Profil de démonstration. Spécialités : investigation numérique, reconstruction chronologique et analyse statique.' }
  ];
  const ids = [];
  for (const sample of samples) {
    let r;
    try { r = app.findFirstRecordByData('ghost_profiles', 'handle', sample.handle); } catch (_) {
      r = new Record(profiles); r.load({ ...sample, example: true }); app.save(r);
    }
    ids.push(r.id);
  }
  const entries = [
    { title: 'Détecter les accès suspects à LSASS', kind: 'detection', summary: 'Une règle Sigma documentée, ses limites et un protocole de validation sur un environnement isolé.', tags: 'Sigma, Windows, T1003.001', author: ids[0], body: 'CONTEXTE\nL’accès au processus LSASS peut faire partie d’une tentative de collecte d’identifiants. Un événement isolé ne suffit pas à conclure : les outils de diagnostic et de sécurité peuvent produire une télémétrie comparable.\n\nMÉTHODE\nCollecter les événements Sysmon ProcessAccess (Event ID 10) dans un laboratoire Windows autorisé. Vérifier la présence de TargetImage, SourceImage et GrantedAccess. Corréler les événements avec la création de processus et l’identité de l’opérateur.\n\nVALIDATION\nImporter la règle dans un moteur compatible Sigma. Rejouer un jeu de journaux synthétiques contenant des accès bénins et des accès à investiguer. Documenter les résultats et les exceptions ; ne pas activer une réponse automatique sans revue humaine.\n\nLIMITES\nLa configuration de Sysmon conditionne la couverture. Une exclusion trop large peut masquer un comportement pertinent. Cette règle illustrative n’est pas une détection prête pour la production.', code: 'title: Accès au processus LSASS — exemple pédagogique\nstatus: experimental\ndescription: Signal de triage à corréler avec le contexte local\nlogsource:\n  product: windows\n  category: process_access\ndetection:\n  selection:\n    TargetImage|endswith: \'\\lsass.exe\'\n  condition: selection\nfalsepositives:\n  - Outils de sécurité et de diagnostic autorisés\nlevel: medium' },
    { title: 'Identités cloud : les chemins de confiance oubliés', kind: 'research', summary: 'Cartographier les relations de confiance et repérer les permissions qui dépassent le besoin opérationnel.', tags: 'Cloud, IAM, Analyse', author: ids[1], body: 'QUESTION DE RECHERCHE\nComment identifier les relations de confiance inutilisées sans confondre inactivité et absence de besoin ?\n\nPÉRIMÈTRE\nL’étude porte sur un tenant de laboratoire et des identités synthétiques. Elle n’affirme pas l’existence d’une vulnérabilité chez un fournisseur.\n\nPROTOCOLE\nInventorier les comptes de service, les rôles et les politiques. Construire un graphe des relations de confiance. Comparer les permissions effectives aux événements d’audit sur une période représentative. Soumettre les écarts aux responsables avant toute modification.\n\nLIVRABLES\nUn inventaire reproductible, une liste de chemins de confiance à réviser et des décisions de réduction de privilèges traçables.\n\nLIMITES\nL’absence de journal n’est pas une preuve d’absence d’usage. Les tâches saisonnières et les plans de reprise doivent être pris en compte.' },
    { title: 'Reconstruire une chronologie à partir de journaux', kind: 'writeup', summary: 'Un writeup DFIR reproductible : normalisation temporelle, corrélation et explicitation des incertitudes.', tags: 'DFIR, Journaux, Investigation', author: ids[2], body: 'OBJECTIF\nReconstituer une suite d’événements à partir de journaux synthétiques sans présenter une hypothèse comme un fait.\n\nÉTAPES\nConserver les journaux sources en lecture seule et documenter leur empreinte. Normaliser les horodatages en UTC tout en conservant le fuseau original. Regrouper les événements par hôte, compte et identifiant de session.\n\nANALYSE\nDistinguer les faits observés, les corrélations et les hypothèses. Pour chaque étape, indiquer la source, le niveau de confiance et les données manquantes.\n\nREPRODUCTIBILITÉ\nLivrer les transformations appliquées et un tableau chronologique qui permet de revenir à chaque événement source.\n\nPRÉCAUTIONS\nNe pas publier de données personnelles ou de journaux provenant d’un incident réel sans autorisation et anonymisation.' },
    { title: 'Log Lens — normaliser avant d’investiguer', kind: 'tool', summary: 'Un utilitaire de laboratoire pour vérifier des événements JSON et faciliter un premier triage.', tags: 'Python, DFIR, JSON', author: ids[2], body: 'USAGE\nCet exemple lit des événements JSONL depuis l’entrée standard et affiche ceux qui contiennent les champs timestamp et event. Il ne remplace ni un parseur forensique ni un système de conservation des preuves.\n\nEXÉCUTION\nEnregistrer le code sous log_lens.py puis exécuter : python log_lens.py < evenements.jsonl\n\nENTRÉE ATTENDUE\nUne ligne JSON par événement, contenant au minimum timestamp et event. Les lignes invalides sont signalées sur la sortie d’erreur.\n\nPÉRIMÈTRE\nUtiliser uniquement des journaux autorisés et anonymisés. Le code est pédagogique, sans garantie de compatibilité avec tous les formats.', code: 'import json\nimport sys\n\nfor number, line in enumerate(sys.stdin, start=1):\n    try:\n        event = json.loads(line)\n        if not isinstance(event, dict):\n            raise ValueError("Objet JSON attendu")\n        if "timestamp" in event and "event" in event:\n            print(json.dumps(event, ensure_ascii=False))\n        else:\n            print(f"Ligne {number} : champs manquants", file=sys.stderr)\n    except (ValueError, TypeError):\n        print(f"Ligne {number} : JSON invalide", file=sys.stderr)' },
    { title: 'Detection Lab', kind: 'project', summary: 'Construire ensemble un laboratoire de validation de détections, documenté et reproductible.', tags: 'Collaboration, Sigma, Lab', author: ids[0], body: 'INTENTION\nProjet de démonstration : concevoir un environnement isolé pour tester des règles de détection avec une télémétrie synthétique.\n\nCHANTIERS\nDéfinir un format de jeux de tests, documenter les prérequis de collecte et créer une matrice de couverture. Chaque proposition doit inclure ses hypothèses et un cas de test bénin.\n\nCONTRIBUER\nProposer une documentation, un jeu d’événements anonymisé ou une méthode de validation. Préciser le périmètre, le livrable et les limites.\n\nGARDE-FOUS\nAucun test sur des systèmes tiers. Aucun jeu de données comportant des secrets ou des identités réelles. Une revue humaine est nécessaire avant toute publication.' },
    { title: 'Table Talk #01 — Incident dans le cloud', kind: 'exercise', summary: 'Un exercice sur table pour analyser une alerte IAM, confronter les hypothèses et documenter les décisions.', tags: 'Exercice, Cloud, Réponse à incident', author: ids[1], body: 'FORMAT\nExercice de démonstration, asynchrone, de 60 à 90 minutes. Aucun accès à une infrastructure réelle n’est requis.\n\nSCÉNARIO\nUn compte de service synthétique crée une nouvelle clé en dehors de sa fenêtre habituelle. Dix minutes plus tard, une permission de lecture est ajoutée à un rôle.\n\nQUESTIONS\nQuelles données demander ? Quelles hypothèses tester ? Quel confinement est proportionné aux éléments disponibles ? Comment communiquer une incertitude ?\n\nLIVRABLE\nUne chronologie, les décisions argumentées et une liste de points à améliorer. Déposer votre retour d’exercice via une contribution de type exercice.\n\nDÉBRIEF\nComparer les approches sans noter ni classer les participants. Le but est de rendre le raisonnement observable et réutilisable.' }
  ];
  for (const item of entries) {
    try { app.findFirstRecordByData('ghost_work', 'title', item.title); } catch (_) {
      const r = new Record(work); r.load({ ...item, example: true, status: 'published' }); app.save(r);
    }
  }
}, (app) => {
  for (const name of ['ghost_participations', 'ghost_applications', 'ghost_work', 'ghost_profiles']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* Already absent. */ }
  }
  const users = app.findCollectionByNameOrId('users');
  users.fields.removeByName('moderator'); users.createRule = ''; users.updateRule = 'id = @request.auth.id'; app.save(users);
});
