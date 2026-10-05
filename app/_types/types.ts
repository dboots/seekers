export type Character = {
  name: string;
  front: string;
  back: string;
  meeple?: string;
};

export type Badge = {
  badge: string;
  image: string;
};

export type GameData = {
  crystals?: number[];
  mushroom?: string[];
  animals?: Array<Record<string, Array<Record<string, boolean>>>>;
  [key: string]: unknown;
};

export type Animal = {
    animal: string;
    image: string;
}