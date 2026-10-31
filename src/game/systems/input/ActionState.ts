import type { GameInputAction } from './actions';
import type { Element } from '../../types/character';

type HeldAction = Exclude<
  GameInputAction['type'],
  | 'switch_element'
  | 'restart_level'
  | 'aim_reflector'
  | 'turn_reflector'
  | 'close_reflector'
>;

export interface InputFrame {
  direction: -1 | 0 | 1;
  jumpPressed: boolean;
  abilityPressed: boolean;
  abilityHeld?: boolean;
  restartPressed: boolean;
  glideHeld: boolean;
  element: Element | undefined;
  reflectorAngle?: number;
  reflectorTurn?: number;
  closeReflector?: boolean;
}

/** Per-game action state. Sources own their holds; one finger cannot release another. */
export class ActionState {
  private readonly held = new Map<string, Set<HeldAction>>();
  private jumpPressed = false;
  private abilityPressed = false;
  private restartPressed = false;
  private element: Element | undefined;
  private reflectorAngle: number | undefined;
  private reflectorTurn = 0;
  private closeReflector = false;

  dispatch(action: GameInputAction, source: string): void {
    if (action.type === 'restart_level') {
      this.restartPressed = true;
      return;
    }
    if (action.type === 'switch_element') {
      this.element = action.element;
      return;
    }
    if (action.type === 'aim_reflector') {
      if (Number.isFinite(action.angle)) this.reflectorAngle = action.angle;
      return;
    }
    if (action.type === 'turn_reflector') {
      if (Number.isFinite(action.degrees))
        this.reflectorTurn += Math.max(-360, Math.min(360, action.degrees));
      return;
    }
    if (action.type === 'close_reflector') {
      this.closeReflector = true;
      return;
    }
    const actions = this.held.get(source) ?? new Set<HeldAction>();
    if (action.phase === 'pressed') {
      if (action.type === 'jump' && !actions.has('jump'))
        this.jumpPressed = true;
      if (action.type === 'use_ability' && !actions.has('use_ability'))
        this.abilityPressed = true;
      actions.add(action.type);
      this.held.set(source, actions);
    } else {
      actions.delete(action.type);
      if (actions.size === 0) this.held.delete(source);
    }
  }

  read(): InputFrame {
    const active = (type: HeldAction): boolean =>
      [...this.held.values()].some((actions) => actions.has(type));
    const direction =
      Number(active('move_right')) - Number(active('move_left'));
    const frame: InputFrame = {
      direction: direction as -1 | 0 | 1,
      jumpPressed: this.jumpPressed,
      abilityPressed: this.abilityPressed,
      ...(active('use_ability') ? { abilityHeld: true } : {}),
      restartPressed: this.restartPressed,
      glideHeld: active('jump') || active('use_ability'),
      element: this.element,
      ...(this.reflectorAngle !== undefined
        ? { reflectorAngle: this.reflectorAngle }
        : {}),
      ...(this.reflectorTurn ? { reflectorTurn: this.reflectorTurn } : {}),
      ...(this.closeReflector ? { closeReflector: true } : {}),
    };
    this.jumpPressed = false;
    this.abilityPressed = false;
    this.restartPressed = false;
    this.element = undefined;
    this.reflectorAngle = undefined;
    this.reflectorTurn = 0;
    this.closeReflector = false;
    return frame;
  }

  reset(): void {
    this.held.clear();
    this.jumpPressed = false;
    this.abilityPressed = false;
    this.restartPressed = false;
    this.element = undefined;
    this.reflectorAngle = undefined;
    this.reflectorTurn = 0;
    this.closeReflector = false;
  }
}
