import { createContext, useContext, useMemo, useState } from 'react';

export type GameAction =
  | 'move'
  | 'search'
  | 'catch'
  | 'bixxy-power'
  | 'halto-power';

export type CharacterTurnAction = {
  action: GameAction;
  summary: string;
  previousLocation?: string;
};

type GameState = {
  search: boolean;
  capture?: boolean;
  selectedBadges?: string[];
  selectedCharacters?: string[];
  characterStartingSpaces?: Record<string, string>;
  characterLocations?: Record<string, string>;
  completedCharacters?: string[];
  completedCharacterActions?: Record<string, CharacterTurnAction[]>;
  activeCharacter?: string;
  activeAction?: GameAction;
  activeBadge?: string;
};

type GameContextValue = {
  gameState: GameState;
  updateGameState: React.Dispatch<React.SetStateAction<GameState>>;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, updateGameState] = useState<GameState>({
    search: false,
    capture: false,
  });

  const value = useMemo(
    () => ({ gameState, updateGameState }),
    [gameState, updateGameState],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameState() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }

  return context;
}
