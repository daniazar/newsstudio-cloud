import React from "react";
import { AbsoluteFill } from "remotion";
import type { DataGraphicConfig, DataTicker } from "@/lib/studio/parsers/types";
import type { AspectRatio } from "@/lib/types";
import { CandlestickChartLayer } from "./data-graphics/CandlestickChartLayer";
import { BarRaceLayer } from "./data-graphics/BarRaceLayer";
import { GaugeMeterLayer } from "./data-graphics/GaugeMeterLayer";
import { MapSpotlightLayer } from "./data-graphics/MapSpotlightLayer";
import { SpecMatrixLayer } from "./data-graphics/SpecMatrixLayer";
import { TickerTapeLayer } from "./TickerTapeLayer";

export interface DataGraphicsLayerProps {
  dataGraphic?: DataGraphicConfig;
  tickers?: DataTicker[];
  aspectRatio?: AspectRatio;
  startFrame?: number;
  layout?: "fullscreen" | "side_panel" | "floating_pip" | "bottom_card";
  showTickerTape?: boolean;
  accentColor?: string;
}

export const DataGraphicsLayer: React.FC<DataGraphicsLayerProps> = ({
  dataGraphic,
  tickers,
  aspectRatio = "horizontal",
  startFrame = 0,
  layout = "fullscreen",
  showTickerTape = true,
  accentColor = "#06b6d4",
}) => {
  const isVertical = aspectRatio === "vertical";

  if (!dataGraphic && (!tickers || tickers.length === 0)) {
    return null;
  }

  const renderGraphicContent = () => {
    if (!dataGraphic) return null;

    switch (dataGraphic.type) {
      case "candlestick":
      case "sparkline":
        return (
          <CandlestickChartLayer
            data={dataGraphic}
            startFrame={startFrame}
            isVertical={isVertical}
          />
        );
      case "bar_race":
        return (
          <BarRaceLayer
            data={dataGraphic}
            startFrame={startFrame}
            isVertical={isVertical}
          />
        );
      case "gauge":
        return (
          <GaugeMeterLayer
            data={dataGraphic}
            startFrame={startFrame}
            isVertical={isVertical}
          />
        );
      case "map_tracer":
        return (
          <MapSpotlightLayer
            data={dataGraphic}
            startFrame={startFrame}
            isVertical={isVertical}
          />
        );
      case "spec_matrix":
        return (
          <SpecMatrixLayer
            data={dataGraphic}
            startFrame={startFrame}
            isVertical={isVertical}
          />
        );
      default:
        return null;
    }
  };

  // Layout container styling
  const getContainerStyle = (): React.CSSProperties => {
    if (layout === "side_panel") {
      return {
        position: "absolute",
        right: isVertical ? "4%" : "6%",
        top: isVertical ? "15%" : "12%",
        width: isVertical ? "92%" : "60%",
        height: isVertical ? "55%" : "72%",
        zIndex: 25,
      };
    }
    if (layout === "floating_pip") {
      return {
        position: "absolute",
        right: "5%",
        bottom: "16%",
        width: isVertical ? "90%" : "48%",
        maxHeight: "50%",
        zIndex: 25,
      };
    }
    // Default fullscreen centered
    return {
      position: "absolute",
      inset: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: showTickerTape && tickers && tickers.length > 0 ? "70px" : "0px",
      zIndex: 25,
    };
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Primary Motion Graphic Canvas */}
      {dataGraphic && <div style={getContainerStyle()}>{renderGraphicContent()}</div>}

      {/* Optional Continuous Scrolling Bottom Ticker Tape */}
      {showTickerTape && tickers && tickers.length > 0 && (
        <TickerTapeLayer
          items={tickers.map((t) => ({
            symbol: t.symbol,
            value: t.value,
            change: t.change,
            isPositive: t.direction !== "down",
          }))}
          accentColor={accentColor}
          category="FINANCIAL TELEMETRY"
        />
      )}
    </AbsoluteFill>
  );
};
