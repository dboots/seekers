import { useEffect, useState } from 'react';
import { useGameState } from '../game-provider';
import type { GameAction } from '../game-provider';
import type { Animal, Badge, Character, GameData } from '~/_types/types';

const boardLocations = 'ABCDEF'.split('').flatMap((column) =>
  Array.from({ length: 6 }, (_, index) => `${column}${index + 1}`),
);

export function GamePage() {
  const { gameState, updateGameState } = useGameState();
  const [gameData, updateGameData] = useState<GameData>({});
  const [animals, updateAnimals] = useState<Animal[]>([]);
  const [characters, updateCharacters] = useState<Character[]>([]);
  const [badges, updateBadges] = useState<Badge[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<string>('');
  const [selectedTurn, setSelectedTurn] = useState(5);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(true);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    const loadGame = async (game: number) => {
      const response = await fetch(`/games/${game}.json`);
      if (!response.ok) {
        throw new Error(
          `Failed to load game ${game}: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      updateGameData(data);
    };

    const loadAnimals = async () => {
      const response = await fetch('/animals.json');
      if (!response.ok) {
        throw new Error(
          `Failed to load animals: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      updateAnimals(data);
    };

    const loadCharacters = async () => {
      const response = await fetch('/characters.json');
      if (!response.ok) {
        throw new Error(
          `Failed to load characters: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      updateCharacters(data);
    };

    const loadBadges = async () => {
      const response = await fetch('/badges.json');
      if (!response.ok) {
        throw new Error(
          `Failed to load badges: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      updateBadges(data.badges);
    };

    loadGame(1).catch((error) => console.error(error));
    loadAnimals().catch((error) => console.error(error));
    loadCharacters().catch((error) => console.error(error));
    loadBadges().catch((error) => console.error(error));
  }, []);

  const animalTurnIndex = Math.max(0, selectedTurn - 5);
  const mushroomTurnIndex = Math.max(0, selectedTurn - 1);
  const animalStatus = selectedAnimal
    ? (gameData.animals?.[animalTurnIndex]?.[selectedAnimal] as
        | Array<Record<string, boolean>>
        | undefined)
    : undefined;
  const turnCount = 13;
  const activeCharacterIsDone = gameState.activeCharacter
    ? (gameState.completedCharacters?.includes(gameState.activeCharacter) ?? false)
    : false;
  const activeCharacterActions = gameState.activeCharacter
    ? gameState.completedCharacterActions?.[gameState.activeCharacter] ?? []
    : [];
  const hasUsedSearchOrCatch = activeCharacterActions.some(
    ({ action }) => action === 'search' || action === 'catch',
  );
  const hasUsedMove = activeCharacterActions.some(({ action }) => action === 'move');
  const hasUsedPower = activeCharacterActions.some(
    ({ action }) => action === 'bixxy-power' || action === 'halto-power',
  );
  const availableActions: { action: GameAction; label: string }[] = [
    { action: 'move', label: 'Move' },
    { action: 'search', label: 'Search' },
    { action: 'catch', label: 'Catch' },
    ...(gameState.activeCharacter === 'Bixxy'
      ? [{ action: 'bixxy-power' as const, label: "Bixxy's power" }]
      : []),
    ...(gameState.activeCharacter === 'Halto'
      ? [{ action: 'halto-power' as const, label: "Halto's power" }]
      : []),
  ];

  const selectCharacter = (character: string) => {
    if (gameState.completedCharacters?.includes(character)) return;

    updateGameState((current) => ({
      ...current,
      activeCharacter: character,
      activeAction: undefined,
      activeBadge: undefined,
      search: false,
      capture: false,
    }));
  };

  const recordActiveCharacterAction = (
    action: GameAction,
    summary: string,
    previousLocation?: string,
  ) => {
    updateGameState((current) => {
      if (!current.activeCharacter || current.completedCharacters?.includes(current.activeCharacter)) {
        return current;
      }

      const character = current.activeCharacter;
      const actions = current.completedCharacterActions?.[character] ?? [];
      const actionAlreadyUsed = actions.some(({ action: recordedAction }) => {
        if (action === 'search' || action === 'catch') {
          return recordedAction === 'search' || recordedAction === 'catch';
        }
        return recordedAction === action;
      });
      if (actionAlreadyUsed) return current;

      return {
        ...current,
        activeAction: action,
        search: action === 'search',
        capture: action === 'catch',
        completedCharacterActions: {
          ...current.completedCharacterActions,
          [character]: [...actions, { action, summary, previousLocation }],
        },
      };
    });
  };

  const selectAction = (action: GameAction) => {
    if (action === 'catch' || action === 'bixxy-power' || action === 'halto-power') {
      if (action === 'catch' ? hasUsedSearchOrCatch : hasUsedPower) return;

      const activeLocation = gameState.activeCharacter
        ? gameState.characterLocations?.[gameState.activeCharacter] ??
          gameState.characterStartingSpaces?.[gameState.activeCharacter]
        : undefined;
      const mushroomLocation = gameData.mushroom?.[mushroomTurnIndex];
      const summary = action === 'catch'
        ? activeLocation && mushroomLocation && activeLocation === mushroomLocation
          ? `Success: caught the Mushroom at ${mushroomLocation}`
          : mushroomLocation
            ? `Failure`
            : `Failure: no Mushroom location data for Turn ${selectedTurn}`
        : action === 'bixxy-power'
          ? "Used Bixxy's power"
          : "Used Halto's power";
      recordActiveCharacterAction(action, summary);
    } else {
      updateGameState((current) => ({
        ...current,
        activeAction: action,
        search: action === 'search',
        capture: false,
      }));
    }

    setIsMoveModalOpen(action === 'move');
    setIsSearchModalOpen(action === 'search');
  };

  const selectMoveLocation = (location: string) => {
    updateGameState((current) => {
      if (!current.activeCharacter) return current;

      const character = current.activeCharacter;
      const actions = current.completedCharacterActions?.[character] ?? [];
      if (actions.some(({ action }) => action === 'move')) {
        return current;
      }
      const previousLocation =
        current.characterLocations?.[character] ??
        current.characterStartingSpaces?.[character];

      return {
        ...current,
        activeAction: 'move',
        characterLocations: {
          ...current.characterLocations,
          [character]: location,
        },
        completedCharacterActions: {
          ...current.completedCharacterActions,
          [character]: [...actions, {
            action: 'move',
            summary: `Moved to ${location}`,
            previousLocation,
          }],
        },
      };
    });
    setIsMoveModalOpen(false);
  };

  const selectSearchAnimal = (animal: string) => {
    setSelectedAnimal(animal);
    const results = gameData.animals?.[animalTurnIndex]?.[animal] as
      | Array<Record<string, boolean>>
      | undefined;
    const resultSummary = results
      ? results
          .flatMap((entry) =>
            Object.entries(entry).map(
              ([location, isPresent]) => `${location} ${isPresent ? 'Yes' : 'No'}`,
            ),
          )
          .join(', ')
      : 'no search data available';

    recordActiveCharacterAction(
      'search',
      `Searched for ${animal} on Turn ${selectedTurn}: ${resultSummary}`,
    );
    setIsSearchModalOpen(false);
  };

  const undoCharacterAction = (character: string) => {
    const characterActions = gameState.completedCharacterActions?.[character] ?? [];
    const undoneAction = characterActions.at(-1);

    updateGameState((current) => {
      const remainingActions = characterActions.slice(0, -1);
      const completedCharacterActions = { ...current.completedCharacterActions };
      if (remainingActions.length > 0) {
        completedCharacterActions[character] = remainingActions;
      } else {
        delete completedCharacterActions[character];
      }
      const completedCharacters = current.completedCharacters?.filter(
        (completedCharacter) => completedCharacter !== character,
      );
      let characterLocations = current.characterLocations;

      if (undoneAction?.action === 'move') {
        const { [character]: _currentLocation, ...otherLocations } =
          current.characterLocations ?? {};
        characterLocations = undoneAction.previousLocation
          ? { ...otherLocations, [character]: undoneAction.previousLocation }
          : otherLocations;
      }

      return {
        ...current,
        activeCharacter: character,
        activeAction: undefined,
        activeBadge: undefined,
        search: false,
        capture: false,
        completedCharacters,
        completedCharacterActions,
        characterLocations,
      };
    });

    setSelectedAnimal('');
    setIsSearchModalOpen(false);
    setIsMoveModalOpen(false);
  };

  const markCharacterDone = () => {
    if (!gameState.activeCharacter || activeCharacterIsDone) return;

    updateGameState((current) => ({
      ...current,
      completedCharacters: [
        ...(current.completedCharacters ?? []),
        gameState.activeCharacter!,
      ],
    }));
    setIsSearchModalOpen(false);
    setIsMoveModalOpen(false);
  };

  const toggleActiveBadge = (badge: string) => {
    updateGameState((current) => ({
      ...current,
      activeBadge: current.activeBadge === badge ? undefined : badge,
    }));
  };

  const resetTurnState = (turn: number) => {
    setSelectedTurn(turn);
    setSelectedAnimal('');
    setIsMoveModalOpen(false);
    setIsSearchModalOpen(false);
    updateGameState((current) => ({
      ...current,
      activeCharacter: undefined,
      activeAction: undefined,
      activeBadge: undefined,
      completedCharacters: [],
      completedCharacterActions: {},
      search: false,
      capture: false,
    }));
  };

  const completeTurn = () => {
    if (selectedTurn >= turnCount) return;
    resetTurnState(Math.min(selectedTurn + 1, turnCount));
  };

  return (
    <main style={{ padding: 24 }}>
      <section aria-labelledby='characters-heading' style={{ marginBottom: 24 }}>
        <h2 id='characters-heading' style={{ marginTop: 0 }}>
          Characters
        </h2>
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {(gameState.selectedCharacters ?? []).map((character) => {
            const characterDetails = characters.find(
              ({ name }) => name === character,
            );
            const isActive = gameState.activeCharacter === character;
            const isDone = gameState.completedCharacters?.includes(character) ?? false;

            return (
              <li
                key={character}
                style={{ position: 'relative' }}
              >
                <button
                  type='button'
                  aria-pressed={isActive}
                  disabled={isDone}
                  onClick={() => selectCharacter(character)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    border: isDone
                      ? '2px solid #16734a'
                      : isActive
                        ? '2px solid gold'
                        : '1px solid #999',
                    borderRadius: 6,
                    background: isDone
                      ? '#e5f4eb'
                      : isActive
                        ? '#fff8d9'
                        : 'white',
                    cursor: isDone ? 'not-allowed' : 'pointer',
                    opacity: 1,
                  }}
                >
                  {characterDetails?.meeple ? (
                    <img
                      src={`/images/characters/${characterDetails.meeple}`}
                      alt=''
                      width={36}
                      height={36}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : null}
                  <span>
                    <strong>{character}</strong>
                    <br />
                    Location: {gameState.characterLocations?.[character] ?? gameState.characterStartingSpaces?.[character] ?? 'No location'}
                            {(gameState.completedCharacterActions?.[character] ?? []).map(
                              ({ summary }, actionIndex) => (
                                <span key={`${character}-action-${actionIndex}`}>
                                  <br />
                                  Action: {summary}
                                </span>
                              ),
                            )}
                  </span>
                </button>
                {isDone ||
                (gameState.completedCharacterActions?.[character]?.length ?? 0) > 0 ? (
                  <button
                    type='button'
                    aria-label={`Undo ${character}'s last action or done status`}
                    title={`Undo ${character}'s last action`}
                    onClick={() => undoCharacterAction(character)}
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      zIndex: 1,
                      display: 'grid',
                      placeItems: 'center',
                      width: 30,
                      height: 30,
                      padding: 0,
                      border: '1px solid #16734a',
                      borderRadius: '50%',
                      background: 'white',
                      color: '#16734a',
                      fontSize: 20,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ↶
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
      {gameState.activeCharacter ? (
        <section aria-labelledby='actions-heading' style={{ marginBottom: 24 }}>
          <h2 id='actions-heading'>
            {activeCharacterIsDone
              ? `${gameState.activeCharacter} is done for this turn`
              : `${gameState.activeCharacter}'s turn: choose an action`}
          </h2>
          {activeCharacterIsDone ? (
            <p role='status'>Turn complete.</p>
          ) : (
            <div role='group' aria-label={`${gameState.activeCharacter} actions`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableActions.map(({ action, label }) => (
                <button
                  key={action}
                  type='button'
                  aria-pressed={gameState.activeAction === action}
                  disabled={
                    (action === 'search' || action === 'catch')
                      ? hasUsedSearchOrCatch
                      : action === 'move'
                        ? hasUsedMove
                        : hasUsedPower
                  }
                  onClick={() => selectAction(action)}
                  style={{
                    padding: '8px 12px',
                    border: gameState.activeAction === action ? '2px solid #16734a' : '1px solid #777',
                    borderRadius: 6,
                    background: gameState.activeAction === action ? '#e5f4eb' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
              <button type='button' onClick={markCharacterDone}>
                Mark done
              </button>
            </div>
          )}
        </section>
      ) : null}
      {(gameState.selectedBadges?.length ?? 0) > 0 ? (
        <section aria-labelledby='badges-heading' style={{ marginBottom: 24 }}>
          <h2 id='badges-heading'>Badge cards</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {gameState.selectedBadges?.map((badgeName) => {
              const badge = badges.find(({ badge }) => badge === badgeName);
              const isActive = gameState.activeBadge === badgeName;

              return (
                <button
                  key={badgeName}
                  type='button'
                  aria-label={`Use badge: ${badgeName}`}
                  aria-pressed={isActive}
                  disabled={!gameState.activeCharacter || activeCharacterIsDone}
                  onClick={() => toggleActiveBadge(badgeName)}
                  style={{
                    display: 'grid',
                    justifyItems: 'center',
                    gap: 6,
                    width: 112,
                    padding: 6,
                    border: isActive ? '3px solid gold' : '1px solid #999',
                    borderRadius: 6,
                    background: 'white',
                    cursor:
                      gameState.activeCharacter && !activeCharacterIsDone
                        ? 'pointer'
                        : 'not-allowed',
                    opacity:
                      gameState.activeCharacter && !activeCharacterIsDone
                        ? 1
                        : 0.6,
                  }}
                >
                  {badge ? (
                    <img
                      src={`/images/badges/${badge.image}`}
                      alt=''
                      width={96}
                      height={134}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : null}
                  <span>{badgeName}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 24,
        }}
      >
        <label htmlFor='turn-select' style={{ marginRight: 8 }}>
          Current turn
        </label>
        <select
          id='turn-select'
          value={selectedTurn}
          onChange={(event) => resetTurnState(Number(event.target.value))}
        >
          {Array.from({ length: turnCount - 4 }, (_, index) => index + 5).map((turn) => (
            <option key={turn} value={turn}>
              Turn {turn}
            </option>
          ))}
        </select>
        <button
          type='button'
          onClick={completeTurn}
          disabled={selectedTurn >= turnCount}
        >
          Complete turn
        </button>
      </div>

      {isSearchModalOpen && gameState.activeAction === 'search' ? (
        <div
          role='presentation'
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='search-heading'
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '100%',
              overflowY: 'auto',
              padding: 24,
              borderRadius: 8,
              background: 'white',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <h2 id='search-heading' style={{ margin: 0 }}>
                Search animals
              </h2>
              <button
                type='button'
                onClick={() => setIsSearchModalOpen(false)}
              >
                Close
              </button>
            </header>

            {selectedAnimal && animalStatus ? (
              <section
                aria-labelledby='search-results-heading'
                style={{ marginBottom: 24 }}
              >
                <h3 id='search-results-heading' style={{ margin: '0 0 10px' }}>
                  {selectedAnimal} · Turn {selectedTurn}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {animalStatus.flatMap((entry, index) =>
                    Object.entries(entry).map(([location, isPresent]) => (
                      <div
                        key={`${selectedAnimal}-${index}-${location}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          minWidth: 112,
                          padding: '8px 12px',
                          border: '1px solid #d5d5cf',
                          borderRadius: 6,
                          background: '#f7f8f5',
                        }}
                      >
                        <span>{location}</span>
                        <strong
                          style={{ color: isPresent ? '#16734a' : '#a43e35' }}
                        >
                          {isPresent ? 'Yes' : 'No'}
                        </strong>
                      </div>
                    )),
                  )}
                </div>
              </section>
            ) : null}
            {selectedAnimal && !animalStatus ? (
              <p role='status'>
                No search data is available for Turn {selectedTurn}.
              </p>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
                gap: 12,
              }}
            >
              {animals.map((animal, index) => {
                const isSelected = selectedAnimal === animal.animal;

                return (
                  <button
                    key={`${animal.animal}-${index}`}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => selectSearchAnimal(animal.animal)}
                    style={{
                      display: 'grid',
                      justifyItems: 'center',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      padding: 10,
                      border: isSelected ? '2px solid #16734a' : '1px solid #c8c8c2',
                      borderRadius: 6,
                      background: isSelected ? '#e8f4ec' : 'white',
                      color: '#20231f',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      width={160}
                      height={224}
                      src={animal.image}
                      alt=''
                      style={{ objectFit: 'contain', maxWidth: '100%' }}
                    />
                    <span>{animal.animal}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
      {isEntryModalOpen ? (
        <div
          role='presentation'
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='game-entry-title'
            style={{
              padding: 24,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <p>
              These are the 2 Sneaky Steps in play. Find them and reveal them
              face up on the table.
            </p>
            <p>
              In the first 5 steps, the Mushroom found a crystal on these steps.
              Place a crystal under each of these steps:
            </p>
            <p>
              <input
                type='text'
                value={gameData.crystals?.join(', ') ?? 'Loading...'}
                disabled
              />
            </p>
            <p>Place the Step counter on Step 5.</p>
            <button type='button' onClick={() => setIsEntryModalOpen(false)}>
              Next
            </button>
          </section>
        </div>
      ) : null}
      {isMoveModalOpen && gameState.activeCharacter ? (
        <div
          role='presentation'
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='move-location-title'
            style={{
              width: 'min(420px, calc(100vw - 48px))',
              padding: 24,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <h2 id='move-location-title'>
              Choose a destination for {gameState.activeCharacter}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {boardLocations.map((location) => (
                <button
                  key={location}
                  type='button'
                  onClick={() => selectMoveLocation(location)}
                  style={{ aspectRatio: '1', padding: 4 }}
                >
                  {location}
                </button>
              ))}
            </div>
            <button
              type='button'
              onClick={() => setIsMoveModalOpen(false)}
              style={{ marginTop: 16 }}
            >
              Cancel
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
