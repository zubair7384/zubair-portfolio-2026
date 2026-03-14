declare module 'gsap-trial/SplitText' {
  export class SplitText {
    constructor(target: any, vars: any);
    chars: HTMLElement[];
    words: HTMLElement[];
    lines: HTMLElement[];
    revert(): void;
  }
}

declare module 'gsap-trial/ScrollSmoother' {
  export class ScrollSmoother {
    static create(vars: any): ScrollSmoother;
    static refresh(vars?: any): void;
    paused(value: boolean): void;
    scrollTop(value?: number): number | void;
    scrollTo(target: any, smooth?: boolean, position?: string): void;
  }
}

declare module 'gsap-trial/all' {
  export * from 'gsap-trial/SplitText';
  export * from 'gsap-trial/ScrollSmoother';
}

declare module 'gsap-trial/ScrollTrigger';
declare module 'gsap-trial/DrawSVGPlugin';
