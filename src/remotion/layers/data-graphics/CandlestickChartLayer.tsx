import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { CandlestickData, SparklineData } from "@/lib/studio/parsers/types";

export interface CandlestickChartLayerProps {
  data: CandlestickData | SparklineData;
  startFrame?: number;
  width?: number | string;
  height?: number | string;
  isVertical?: boolean;
}

export const CandlestickChartLayer: React.FC<CandlestickChartLayerProps> = ({
  data,
  startFrame = 0,
  width = "100%",
  height = "100%",
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - startFrame);

  const entrance = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const cardOpacity = interpolate(entrance, [0, 1], [0, 1]);
  const cardScale = interpolate(entrance, [0, 1], [0.95, 1]);

  if (data.type === "sparkline") {
    return (
      <SparklineView
        data={data}
        relFrame={relFrame}
        fps={fps}
        cardOpacity={cardOpacity}
        cardScale={cardScale}
        width={width}
        height={height}
        isVertical={isVertical}
      />
    );
  }

  return (
    <CandlestickView
      data={data}
      relFrame={relFrame}
      fps={fps}
      cardOpacity={cardOpacity}
      cardScale={cardScale}
      width={width}
      height={height}
      isVertical={isVertical}
    />
  );
};

// ─── Sparkline Subcomponent ──────────────────────────────────────────────────

function SparklineView({
  data,
  relFrame,
  fps,
  cardOpacity,
  cardScale,
  width,
  height,
  isVertical,
}: {
  data: SparklineData;
  relFrame: number;
  fps: number;
  cardOpacity: number;
  cardScale: number;
  width: number | string;
  height: number | string;
  isVertical: boolean;
}) {
  const points = data.points || [];
  const minVal = points.length > 0 ? Math.min(...points.map((p) => p.value)) * 0.98 : 0;
  const maxVal = points.length > 0 ? Math.max(...points.map((p) => p.value)) * 1.02 : 100;
  const valRange = maxVal - minVal || 1;

  // Viewbox coordinates
  const svgWidth = 800;
  const svgHeight = isVertical ? 380 : 320;
  const padLeft = 40;
  const padRight = 40;
  const padTop = 30;
  const padBottom = 40;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const coords = points.map((p, idx) => {
    const x = padLeft + (idx / Math.max(1, points.length - 1)) * chartW;
    const y = padTop + (1 - (p.value - minVal) / valRange) * chartH;
    return { x, y, ...p };
  });

  const linePath = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${
          padTop + chartH
        } Z`
      : "";

  // Progressive line draw animation (stroke-dashoffset)
  const drawProgress = spring({
    frame: relFrame,
    fps,
    config: { damping: 20, stiffness: 60 },
  });

  const pathLength = 2000;
  const strokeDashoffset = interpolate(drawProgress, [0, 1], [pathLength, 0]);

  // Laser tracer dot tracking current tip
  const activeIdx = Math.min(
    coords.length - 1,
    Math.floor(drawProgress * Math.max(1, coords.length - 1))
  );
  const tracerPoint = coords[activeIdx] || { x: padLeft, y: padTop + chartH / 2 };

  const isGreen = data.isPositive !== false;
  const themeColor = data.accentColor || (isGreen ? "#10b981" : "#ef4444");

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: cardOpacity,
        transform: `scale(${cardScale})`,
        padding: isVertical ? "16px" : "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isVertical ? "100%" : "880px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.95) 100%)",
          border: `1px solid ${themeColor}40`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px ${themeColor}20`,
          borderRadius: "24px",
          padding: isVertical ? "20px" : "28px",
          backdropFilter: "blur(16px)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: `${themeColor}25`,
                  color: themeColor,
                  border: `1px solid ${themeColor}60`,
                  fontSize: isVertical ? "11px" : "13px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "8px",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                {data.symbol}
              </span>
              <span style={{ fontSize: isVertical ? "13px" : "15px", color: "#94a3b8", fontWeight: 600 }}>
                {data.title}
              </span>
            </div>
            <div
              style={{
                fontSize: isVertical ? "28px" : "38px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                marginTop: "6px",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
              }}
            >
              <span>{data.currentValue}</span>
              <span
                style={{
                  fontSize: isVertical ? "14px" : "18px",
                  fontWeight: 700,
                  color: themeColor,
                  background: `${themeColor}15`,
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                {data.deltaPercentage}
              </span>
            </div>
          </div>

          {data.timeframe && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "4px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#cbd5e1",
                fontFamily: "monospace",
              }}
            >
              {data.timeframe} TIMEFRAME
            </div>
          )}
        </div>

        {/* Chart SVG */}
        <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: "12px" }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <defs>
              <linearGradient id={`sparkGrad-${data.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeColor} stopOpacity="0.45" />
                <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
              </linearGradient>
              <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle Grid Lines */}
            {[0.25, 0.5, 0.75].map((ratio, i) => (
              <line
                key={i}
                x1={padLeft}
                y1={padTop + ratio * chartH}
                x2={padLeft + chartW}
                y2={padTop + ratio * chartH}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* Filled Gradient Area */}
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#sparkGrad-${data.symbol})`}
                opacity={drawProgress}
              />
            )}

            {/* Main Sparkline Stroke */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={themeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={pathLength}
                strokeDashoffset={strokeDashoffset}
                filter="url(#laserGlow)"
              />
            )}

            {/* Pulsing Laser Head Dot */}
            <circle
              cx={tracerPoint.x}
              cy={tracerPoint.y}
              r={6}
              fill="#ffffff"
              stroke={themeColor}
              strokeWidth="3"
              filter="url(#laserGlow)"
            />

            {/* High Annotation Callout */}
            {data.highAnnotation && (
              <g transform={`translate(${padLeft + chartW * 0.7}, ${padTop + 10})`}>
                <rect
                  x="-60"
                  y="-14"
                  width="120"
                  height="22"
                  rx="6"
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke={themeColor}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {data.highAnnotation}
                </text>
              </g>
            )}

            {/* X-Axis Labels */}
            {coords.map((pt, i) => (
              <text
                key={i}
                x={pt.x}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="600"
              >
                {pt.label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Candlestick Subcomponent ────────────────────────────────────────────────

function CandlestickView({
  data,
  relFrame,
  fps,
  cardOpacity,
  cardScale,
  width,
  height,
  isVertical,
}: {
  data: CandlestickData;
  relFrame: number;
  fps: number;
  cardOpacity: number;
  cardScale: number;
  width: number | string;
  height: number | string;
  isVertical: boolean;
}) {
  const candles = data.candles || [];
  const allPrices = candles.flatMap((c) => [c.low, c.high]);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) * 0.99 : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) * 1.01 : 100;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = candles.length > 0 ? Math.max(...candles.map((c) => c.volume || 1)) : 1;

  const svgWidth = 840;
  const svgHeight = isVertical ? 440 : 360;
  const padLeft = 50;
  const padRight = 50;
  const padTop = 30;
  const chartBottom = svgHeight - 70; // Reserve bottom 70px for volume histogram
  const chartHeight = chartBottom - padTop;
  const volumeHeight = 50;

  const candleSlotWidth = (svgWidth - padLeft - padRight) / Math.max(1, candles.length);
  const candleBodyWidth = Math.min(28, candleSlotWidth * 0.65);

  const isGreenOverall = data.isPositive !== false;
  const primaryAccent = data.accentColor || (isGreenOverall ? "#10b981" : "#ef4444");

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: cardOpacity,
        transform: `scale(${cardScale})`,
        padding: isVertical ? "16px" : "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isVertical ? "100%" : "920px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)",
          border: `1px solid ${primaryAccent}50`,
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${primaryAccent}25`,
          borderRadius: "24px",
          padding: isVertical ? "20px" : "28px",
          backdropFilter: "blur(18px)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: `${primaryAccent}25`,
                  color: primaryAccent,
                  border: `1px solid ${primaryAccent}60`,
                  fontSize: isVertical ? "12px" : "14px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "8px",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                {data.symbol}
              </span>
              <span style={{ fontSize: isVertical ? "13px" : "16px", color: "#94a3b8", fontWeight: 600 }}>
                {data.name || "Real-Time Exchange Data"}
              </span>
            </div>

            <div
              style={{
                fontSize: isVertical ? "30px" : "40px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                marginTop: "8px",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
              }}
            >
              <span>{data.currentPrice}</span>
              <span
                style={{
                  fontSize: isVertical ? "14px" : "18px",
                  fontWeight: 700,
                  color: primaryAccent,
                  background: `${primaryAccent}15`,
                  padding: "3px 9px",
                  borderRadius: "6px",
                }}
              >
                {data.change}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            {data.timeframe && (
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  fontFamily: "monospace",
                }}
              >
                {data.timeframe} CANDLES
              </span>
            )}
            {data.calloutText && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                ⚡ {data.calloutText}
              </span>
            )}
          </div>
        </div>

        {/* Candlestick SVG */}
        <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <defs>
              <filter id="candleGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
              <line
                key={i}
                x1={padLeft}
                y1={padTop + ratio * chartHeight}
                x2={svgWidth - padRight}
                y2={padTop + ratio * chartHeight}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* High/Low Reference Line */}
            <line
              x1={padLeft}
              y1={chartBottom}
              x2={svgWidth - padRight}
              y2={chartBottom}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />

            {/* Render Candlesticks */}
            {candles.map((candle, idx) => {
              const candleSpring = spring({
                frame: relFrame - idx * 2.5,
                fps,
                config: { damping: 12, stiffness: 85 },
              });

              const isBull = candle.close >= candle.open;
              const candleColor = isBull ? "#10b981" : "#ef4444";

              const xCenter = padLeft + idx * candleSlotWidth + candleSlotWidth / 2;

              // High/Low wick coordinates
              const yHigh = padTop + (1 - (candle.high - minPrice) / priceRange) * chartHeight;
              const yLow = padTop + (1 - (candle.low - minPrice) / priceRange) * chartHeight;

              // Body coordinates
              const bodyTopVal = Math.max(candle.open, candle.close);
              const bodyBottomVal = Math.min(candle.open, candle.close);
              const yBodyTop = padTop + (1 - (bodyTopVal - minPrice) / priceRange) * chartHeight;
              const yBodyBottom = padTop + (1 - (bodyBottomVal - minPrice) / priceRange) * chartHeight;
              const rawBodyH = Math.max(3, yBodyBottom - yBodyTop);

              // Spring reveal scaling
              const scaleY = interpolate(candleSpring, [0, 1], [0, 1]);
              const bodyHeight = rawBodyH * scaleY;
              const animatedYTop = yBodyTop + (rawBodyH - bodyHeight) / 2;

              // Volume bar coordinates
              const volRatio = (candle.volume || 1) / maxVolume;
              const volBarH = volRatio * volumeHeight * scaleY;
              const volY = svgHeight - 20 - volBarH;

              return (
                <g key={idx} opacity={candleSpring}>
                  {/* Upper & Lower Wick */}
                  <line
                    x1={xCenter}
                    y1={yHigh}
                    x2={xCenter}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Candle Body */}
                  <rect
                    x={xCenter - candleBodyWidth / 2}
                    y={animatedYTop}
                    width={candleBodyWidth}
                    height={bodyHeight}
                    rx="3"
                    fill={candleColor}
                    stroke={candleColor}
                    strokeWidth="1.5"
                    filter="url(#candleGlow)"
                  />

                  {/* Volume Sub-Bar */}
                  <rect
                    x={xCenter - (candleBodyWidth * 0.7) / 2}
                    y={volY}
                    width={candleBodyWidth * 0.7}
                    height={volBarH}
                    rx="2"
                    fill={candleColor}
                    opacity="0.4"
                  />

                  {/* Candle Timestamp/Label */}
                  {candle.timestamp && (
                    <text
                      x={xCenter}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {candle.timestamp}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
