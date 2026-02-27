import { useContext, useEffect, useState } from "preact/hooks";
import { parseUrlReportRegion, useHashRoute } from "./routing";
import { MatchReport, type Report } from "./report";
import { RegionTree } from "./region-tree";
import { addRegionBboxLayer, type BboxLayerHandle } from "./region-bbox-layer";
import { MapContext } from "../app";
import { cls } from "./cls";
import { DATA_BASE_URL } from "../config";
import "./report-selector.css";

type MatchReportSelectorProps = {
    onSelectReport?: (reportRegion: string | null) => void;
};
export function MatchReportSelector({ onSelectReport }: MatchReportSelectorProps) {
    const [expanded, setExpanded] = useState(true);
    const [matchReports, setMatchReports] = useState<Report[]>([]);

    const reportRegion = useHashRoute(parseUrlReportRegion);

    useEffect(() => {
        fetch(`${DATA_BASE_URL}/match-report.json`)
            .then(r => r.json())
            .then(data => { setMatchReports(data.matchedRegions); });
    }, [setMatchReports]);

    // --- Region bbox layer on the map ---
    const mapCtx = useContext(MapContext);
    const [bboxHandle, setBboxHandle] = useState<BboxLayerHandle | null>(null);

    // Add bbox layer once when reports are loaded (keep it for the whole session)
    useEffect(() => {
        if (!mapCtx || matchReports.length === 0) return;

        let handle: BboxLayerHandle | undefined;

        mapCtx.loaded.then(map => {
            handle = addRegionBboxLayer(map, matchReports, (region) => {
                onSelectReport?.(region);
                window.location.hash = `#/match-report/${region}`;
            });
            setBboxHandle(handle);
        });

        return () => { handle?.remove(); setBboxHandle(null); };
    }, [mapCtx, matchReports, onSelectReport]);

    // Highlight the selected region's bbox (or clear highlight)
    useEffect(() => {
        bboxHandle?.setSelectedRegion(reportRegion ?? null);
    }, [bboxHandle, reportRegion]);

    const reportData = reportRegion && matchReports.find(r => r.region === reportRegion);

    if (reportData) {
        return (
            <>
                <div className={'right-top'}>
                    <div>
                        <a onClick={() => onSelectReport?.(null)} href="#/">Back to reports</a>
                        <span className={'float-right'}>
                            <span className={'link-like'} onClick={() => setExpanded(!expanded)}>
                                {expanded ? 'Hide' : 'Show'}
                            </span>
                        </span>
                    </div>
                    <div className={cls('report-datasets', expanded ? 'expanded' : 'collapsed')}>
                        {<MatchReport
                            key={reportRegion}
                            reportRegion={reportRegion}
                            reportData={reportData} />}
                    </div>
                </div>
            </>
        )
    }

    const [minimized, setMinimized] = useState(false);

    if (minimized) {
        return (
            <div className="overlay-minimized">
                <button className="overlay-toggle-btn" onClick={() => setMinimized(false)}
                    title="Show region list">
                    📋 Show Regions
                </button>
            </div>
        );
    }

    return (
        <div className={"overlay"}>
            <div className={'overlay-content'}>
                <div className="overlay-header">
                    <h2>Available match reports</h2>
                    <button className="overlay-close-btn" onClick={() => setMinimized(true)}
                        title="Minimize to see the map">
                        ✕
                    </button>
                </div>
                <div className={'reports'}>
                    <RegionTree reports={matchReports} onSelectReport={onSelectReport} />
                </div>
                <div className={"report-list-footer"}>
                    To add your city or country, or for any other inquiries, please write us at
                    <span> <a href="mailto:publictransport@organicmaps.app">
                        publictransport@organicmaps.app
                    </a></span> or create an issue on
                    <span> <a href="https://github.com/organicmaps/gtfs-osm-matcher/issues?q=label%3Anew-gtfs-source">
                        GitHub
                    </a></span>
                </div>
            </div>
        </div>
    )
}
