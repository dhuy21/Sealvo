import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { GAME_LEVEL, type GameType } from '@sealvo/shared';

/** Route param → GameType; `hasOwn` also rejects prototype keys such as `constructor` */
@Injectable()
export class ParseGameTypePipe implements PipeTransform<string, GameType> {
  transform(value: string): GameType {
    if (!Object.hasOwn(GAME_LEVEL, value)) {
      throw new BadRequestException(`Type de jeu inconnu : ${value}`);
    }
    return value as GameType;
  }
}
