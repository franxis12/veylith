import { englishIllustratedText } from './illustratedLevelText';
import { englishEarthText } from './earthLevelText';
/** Exact source matching preserves custom editor text and canonical JSON files. */
export const englishLevelText: Readonly<Record<string, string>> = {
  ...englishEarthText,
  'El primer despertar': 'The First Awakening',
  'La cantera hundida': 'The Sunken Quarry',
  'Contra el viento': 'Against the Wind',
  'Las islas del lago': 'The Lake Islands',
  'La escalera rota': 'The Broken Stairway',
  'La máquina dormida': 'The Sleeping Machine',
  'El puente engañoso': 'The Deceptive Bridge',
  'El camino de las alturas': 'The High Path',
  'El peso de la decisión': 'The Weight of Choice',
  'El santuario de piedra': 'The Stone Sanctuary',
  'Bosque de los Orígenes': 'Forest of Origins',
  'La puerta del viento': 'The Wind Gate',
  'Camina contra el bloque hasta encajarlo en la placa.':
    'Push the block until it fits onto the plate.',
  'Rompe el muro agrietado con Poder, desde el suelo.':
    'Use your power from the ground to break the cracked wall.',
  'TIERRA\nSalta las raíces. Empuja la piedra.':
    'EARTH\nJump over the roots. Push the stone.',
  'Empuja hasta la placa hundida.\nEl bloque encajado sirve de escalón.':
    'Push onto the sunken plate.\nThe block becomes a step.',
  'Poder rompe la piedra agrietada.': 'Your power breaks cracked stone.',
  'La palanca del cauce abre el camino al santuario.':
    'The riverside lever opens the path to the sanctuary.',
  'Espera a que el puente termine de extenderse.':
    'Wait for the bridge to fully extend.',
  'Tierra se hunde. Cruza por las plataformas.':
    'Earth sinks. Cross using the platforms.',
  'Santuario →\nMirador: desvío opcional':
    'Sanctuary →\nLookout: optional detour',
  'Mirador\nRegresa al puente inferior.':
    'Lookout\nReturn to the lower bridge.',
  'Salta hacia el mirador ↗\nO baja al puente →':
    'Jump to the lookout ↗\nOr head down to the bridge →',
  'Empuja el bloque por el borde. Baja tras él y llévalo a la placa.':
    'Push the block off the edge. Follow it down and push it onto the plate.',
  'La piedra debe bajar contigo.\nLa placa está en la cantera.':
    'Bring the stone down with you.\nThe plate is in the quarry.',
  'Activa la plataforma y espera en el muelle: siempre vuelve.':
    'Activate the platform and wait at the dock: it always returns.',
  'El ascensor vuelve: espera en el borde y sube cuando llegue.':
    'The lift returns: wait at the edge and board when it arrives.',
  'Espera la plataforma en el muelle.\nBaja en la otra orilla.':
    'Wait for the platform at the dock.\nStep off on the far bank.',
  'Cruza por arriba, baja a la derecha del bloque y empújalo hacia la placa izquierda.':
    'Cross above, drop to the right of the block and push it toward the plate on the left.',
  'Baja por el otro lado.\nLa placa está a la izquierda.':
    'Drop down on the other side.\nThe plate is on the left.',
  'Baja el contrapeso a la primera placa del santuario.':
    'Lower the counterweight onto the sanctuary’s first plate.',
  'Con el contrapeso y el sello abiertos, activa el ascensor.':
    'With the counterweight in place and the seal broken, activate the lift.',
  'El santuario de Tierra\nContrapeso · sello · ascensor':
    'The Earth Sanctuary\nCounterweight · seal · lift',
  'La última piedra resiste dos golpes.': 'The final stone takes two hits.',
  'Sube al puesto y activa la palanca para abrir el primer puente.':
    'Climb to the outpost and activate the lever to open the first bridge.',
  'Tu peso resiste el viento; conserva el equilibrio en los bordes.':
    'Your weight resists the wind; watch your footing at the edges.',
  'El viento no puede moverte.\nAbre el camino desde el puesto.':
    'The wind cannot move you.\nOpen the path from the outpost.',
  'Activa la palanca de la orilla y espera el puente.':
    'Activate the lever on the shore and wait for the bridge.',
  'Tierra se hunde en el lago.\nUsa los puentes y las islas.':
    'Earth sinks in the lake.\nUse the bridges and islands.',
  'La pared es demasiado alta: activa el ascensor y espera su regreso.':
    'The wall is too high: activate the lift and wait for it to return.',
  'La escalera se ha derrumbado.\nLa máquina aún puede subirte.':
    'The stairs have collapsed.\nThe machine can still lift you.',
  'Rompe el sello y acciona la palanca: ambos alimentan el ascensor.':
    'Break the seal and pull the lever: both power the lift.',
  'Arriba, encaja el bloque para extender el puente del taller.':
    'At the top, fit the block onto the plate to extend the workshop bridge.',
  'El contrapeso abre el paso.\nEmpuja el bloque hacia la placa.':
    'The counterweight opens the path.\nPush the block onto the plate.',
  'Mecanismos resueltos. Entra en el portal de salida.':
    'Mechanisms solved. Enter the exit portal.',
  '01 · EL SENDERO\nSalta entre las cornisas':
    '01 · THE TRAIL\nJump between the ledges',
  '02 · GEMA DE FUEGO\nRecógela y salta dos veces':
    '02 · FIRE GEM\nCollect it and jump twice',
  '03 · GEMA DE AIRE →\nRecógela, salta y mantén Jump':
    '03 · AIR GEM →\nCollect it, jump and hold',
  'RUINAS ANTIGUAS\nReliquias inactivas': 'ANCIENT RUINS\nInactive relics',
  SALIDA: 'EXIT',
  TIERRA: 'EARTH',
  ...englishIllustratedText,
};
