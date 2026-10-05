import type { Route } from './+types/game';
import { GamePage } from '../game/game';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Game State' }];
}

export default function GameRoute() {
  return <GamePage />;
}
