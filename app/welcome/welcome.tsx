import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useGameState } from '../game-provider';
import type { Badge, Character } from '~/_types/types';

export function Welcome() {
  const [results, updateResults] = useState('');
  const { gameState, updateGameState } = useGameState();
  const [characters, updateCharacters] = useState<Character[]>([]);
  const [badges, updateBadges] = useState<Badge[]>([]);
  const [pendingCharacter, setPendingCharacter] = useState<string | null>(null);
  useEffect(() => {
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

    loadCharacters().catch((error) => console.error(error));
    loadBadges().catch((error) => console.error(error));
  }, []);

  const selectBadge = (badgeName: string) => {
    updateGameState((current) => ({
      ...current,
      selectedBadges: current.selectedBadges?.includes(badgeName)
        ? current.selectedBadges.filter((name) => name !== badgeName)
        : [...(current.selectedBadges ?? []), badgeName],
    }));
  };

  const toggleCharacterSelection = (name: string) => {
    if (gameState.selectedCharacters?.includes(name)) {
      updateGameState((current) => {
        const { [name]: _startingSpace, ...characterStartingSpaces } =
          current.characterStartingSpaces ?? {};
        const { [name]: _currentLocation, ...characterLocations } =
          current.characterLocations ?? {};

        return {
          ...current,
          selectedCharacters: current.selectedCharacters?.filter(
            (selectedName) => selectedName !== name,
          ),
          characterStartingSpaces,
          characterLocations,
        };
      });
      return;
    }

    setPendingCharacter(name);
  };

  const selectStartingSpace = (startingSpace: string) => {
    if (!pendingCharacter) return;

    updateGameState((current) => ({
      ...current,
      selectedCharacters: [...(current.selectedCharacters ?? []), pendingCharacter],
      characterStartingSpaces: {
        ...current.characterStartingSpaces,
        [pendingCharacter]: startingSpace,
      },
      characterLocations: {
        ...current.characterLocations,
        [pendingCharacter]: startingSpace,
      },
    }));
    setPendingCharacter(null);
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link to="/game" preventScrollReset>
          <button type="button" disabled={(gameState.selectedCharacters?.length ?? 0) < 2}>
            Start
          </button>
        </Link>
      </div>
      {characters.map((c) => {
        const selectedCount = gameState.selectedCharacters?.length ?? 0;
        const shouldShowFront = selectedCount > 2;

        return (
          <div
            key={c.name}
            style={{
              display: 'inline-block',
              perspective: '1000px',
            }}
          >
            <div
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 250,
                  height: 250,
                  margin: '0 5px 0 5px',
                  transition: 'transform 0.6s',
                  transformStyle: 'preserve-3d',
                  transform: shouldShowFront ? 'rotateY(0deg)' : 'rotateY(180deg)',
                }}
              >
                <img
                  src={`/images/characters/${c.front}`}
                  alt={`${c.name} front`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backfaceVisibility: 'hidden',
                  }}
                />
                <img
                  src={`/images/characters/${c.back}`}
                  alt={`${c.name} back`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                />
              </div>
              {c.meeple ? (
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCharacterSelection(c.name);
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={`/images/characters/${c.meeple}`}
                    alt={`${c.name} meeple`}
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: 'contain',
                      filter: gameState.selectedCharacters?.includes(c.name) ? 'drop-shadow(0 0 4px gold)' : 'none',
                    }}
                  />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      <div>
        {badges.map((badge, index) => {
          const isSelected = gameState.selectedBadges?.includes(badge.badge) ?? false;

          return (
            <button
              key={`${badge.badge}-${index}`}
              type='button'
              onClick={() => selectBadge(badge.badge)}
              style={{
                border: isSelected ? '3px solid gold' : 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                borderRadius: 8,
                margin: '0 5px',
              }}
            >
              <img
                src={`/images/badges/${badge.image}`}
                alt={badge.badge}
                style={{
                  width: 750 / 4,
                  height: 1050 / 4,
                  objectFit: 'contain',
                  opacity: isSelected ? 1 : 0.7,
                }}
              />
            </button>
          );
        })}
      </div>
      {gameState.search && <>searching</>}
      {results}
      {JSON.stringify(gameState)}
      {pendingCharacter ? (
        <div
          role="presentation"
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="starting-space-title"
            style={{
              padding: 24,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <h2 id="starting-space-title">Choose a starting space for {pendingCharacter}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {['A1', 'F1', 'A6', 'F6'].map((startingSpace) => (
                <button
                  key={startingSpace}
                  type="button"
                  onClick={() => selectStartingSpace(startingSpace)}
                >
                  {startingSpace}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
