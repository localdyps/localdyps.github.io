function generateTournamentRounds(playersOriginal) {
  const TOTAL_ROUNDS = 8;
  const players = playersOriginal.map(p => ({ ...p }));

  const remainder = players.length % 4;
  const withJoker = (players.length + 1) % 4 === 0;
  const pause1 = (players.length + 3) % 4 === 0;
  const pause2 = (players.length + 2) % 4 === 0;

  if (withJoker) {
    players.push({
      id: 'joker',
      name: '🃏 Joker',
      bucket: 'B',
      isJoker: true,
    });
  }

  const partnerHistory = new Map();
  players.forEach(p => partnerHistory.set(p.id, new Set()));

  const pauseCounts = new Map();
  players.forEach(p => pauseCounts.set(p.id, 0));

  const rounds = [];

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const roundData = {
      round,
      revealed: false,
      matches: [],
      pausers: [],
    };

    let currentPlayers = [...players];

    // Pauzy
    let pausesNeeded = 0;
    if (pause1) pausesNeeded = 1;
    if (pause2) pausesNeeded = 2;

    if (pausesNeeded > 0) {
      const sortedByLeastPaused = [...currentPlayers].sort(
        (a, b) => pauseCounts.get(a.id) - pauseCounts.get(b.id)
      );

      const minPauseCount = pauseCounts.get(sortedByLeastPaused[0].id);

      // Zbierz tylko tych, którzy mają najmniej pauz
      const candidates = sortedByLeastPaused.filter(
        p => pauseCounts.get(p.id) === minPauseCount
      );

      shuffle(candidates);

      const pausedPlayers = candidates.slice(0, pausesNeeded);
      pausedPlayers.forEach(p => {
        pauseCounts.set(p.id, pauseCounts.get(p.id) + 1);
        const index = currentPlayers.findIndex(cp => cp.id === p.id);
        if (index !== -1) currentPlayers.splice(index, 1);
      });

      roundData.pausers = pausedPlayers.map(p => p.id);
    }

    const pairs = [];

    if (round === 1 || round === 2) {
      // Specjalne zasady A–B
      const a = currentPlayers.filter(p => p.bucket === 'A');
      const b = currentPlayers.filter(p => p.bucket === 'B');
      const leftovers = currentPlayers.filter(p => !a.includes(p) && !b.includes(p));

      shuffle(a);
      shuffle(b);

      while (a.length && b.length) {
        const p1 = a.pop();
        const p2 = b.pop();
        markAsPartners(p1.id, p2.id);
        pairs.push([p1, p2]);
      }

      const remaining = [...a, ...b, ...leftovers];
      pairs.push(...greedyPair(remaining, partnerHistory, true));

    } else {
      // Rundy 3–8 – greedy
      pairs.push(...greedyPair(currentPlayers, partnerHistory));
    }

    // Losowanie meczów
    shuffle(pairs);
    for (let i = 0; i < pairs.length; i += 2) {
      const team1 = pairs[i];
      const team2 = pairs[i + 1];
      if (team2) {
        roundData.matches.push({ team1: team1.map(p => p.id), team2: team2.map(p => p.id) });
      }
    }

    rounds.push(roundData);
  }

  // Zamień rundę 2 i 8
  const tmp = rounds[1];
  rounds[1] = rounds[7];
  rounds[7] = tmp;
  rounds[1].round = 2;
  rounds[7].round = 8;

  localStorage.setItem("tournamentRounds", JSON.stringify(rounds));
  return rounds;

  // --- Pomocnicze ---

  function markAsPartners(id1, id2) {
    partnerHistory.get(id1).add(id2);
    partnerHistory.get(id2).add(id1);
  }

  function greedyPair(list, historyMap, exhaustive = false) {
    let best = [];
    for (let attempt = 0; attempt < (exhaustive ? 100 : 20); attempt++) {
      const available = shuffle([...list]);
      const tempPairs = [];
      const used = new Set();

      for (let i = 0; i < available.length; i++) {
        const p1 = available[i];
        if (used.has(p1.id)) continue;

        for (let j = i + 1; j < available.length; j++) {
          const p2 = available[j];
          if (used.has(p2.id)) continue;

          if (!historyMap.get(p1.id).has(p2.id)) {
            tempPairs.push([p1, p2]);
            used.add(p1.id);
            used.add(p2.id);
            break;
          }
        }
      }

      if (tempPairs.length > best.length) {
        best = tempPairs;
        if (best.length * 2 === list.length) break;
      }
    }

    best.forEach(([p1, p2]) => markAsPartners(p1.id, p2.id));
    return best;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

export { generateTournamentRounds };
