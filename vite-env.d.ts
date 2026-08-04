/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module 'lucide-react' {
  import * as React from 'react';
  export type LucideIcon = React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  export const LayoutDashboard: LucideIcon;
  export const FileText: LucideIcon;
  export const FlaskConical: LucideIcon;
  export const History: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Settings: LucideIcon;
  export const Shield: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const XCircle: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const Square: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Plus: LucideIcon;
  export const Play: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Info: LucideIcon;
  export const Lock: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
}

declare module '*.svg?react' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.svg?import&react' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
