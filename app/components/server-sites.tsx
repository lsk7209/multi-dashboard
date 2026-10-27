"use client";
import { Fragment, useState } from "react";
import { APPROVAL_LABELS, HOST_LABELS } from "../lib/site-inventory";
import { compareServerSites, type ServerSortKey, type SortDirection } from "../lib/server-site-sort";
import { getServerSiteIssues, serverSiteMatchesFocus, serverSiteMatchesHost, type ServerSiteFocus } from "../lib/server-site-insights";
import type { ServerSiteRow } from "../lib/server-site-metrics";
const number = (value: number | null | undefined) => value == null ? "미확인" : value.toLocaleString("ko-KR");
const collectionLabel = (value:string) => ({ok:"성공",auth_error:"권한 오류",permission_denied:"권한 오류",binding_mismatch:"연결 불일치",binding_unknown:"연결 미확인",not_collected:"미수집",missing_config:"설정 없음",api_error:"수집 오류",error:"수집 오류"}[value] ?? "수집 확인 필요");
const percent = (value: number | null | undefined) => value == null ? "비교 불가" : `${value > 0 ? "+" : ""}${value.toLocaleString("ko-KR", {maximumFractionDigits:1})}%`;
const time = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? `${new Date(value).toLocaleString("ko-KR", {timeZone:"Asia/Seoul"})} KST` : "미확인";
const approval = (value: string) => value === "NOT_LISTED" ? "조회 계정에 도메인 없음" : APPROVAL_LABELS[value] ?? "미확인";
const hosts = ["ovh", "contabo", "turbo1", "turbo2", "vercel"];
const verified = (site: ServerSiteRow) => hosts.includes(site.host) && site.hostStatus === "public_route_verified";
const FOCUS: {id:ServerSiteFocus;label:string;note:string}[] = [
 {id:"all",label:"전체",note:"관리 도메인 전체"},{id:"access",label:"접속 확인",note:"HTTPS 미확인·오류 응답"},
 {id:"decline",label:"트래픽 급감",note:"직전 50명 이상 · 30%↓"},{id:"search",label:"검색 개선 후보",note:"노출 100+ · CTR 2% 미만"},
 {id:"migration",label:"이전·서버 확인",note:"목적지·준비본 확인"},{id:"attention",label:"전체 점검 대상",note:"수집·접속·변동·이전"},
];
const COLUMNS: {key:ServerSortKey;label:string}[] = [{key:"domain",label:"사이트 / 확인 사항"},{key:"host",label:"서버"},{key:"httpStatus",label:"HTTPS"},{key:"dailyUsers",label:"어제 사용자"},{key:"weeklyUsers",label:"7일 사용자"},{key:"weeklyChange",label:"7일 증감"},{key:"clicks",label:"검색 클릭"},{key:"impressions",label:"검색 노출"},{key:"approval",label:"AdSense 계정"}];
export function ServerSites({sites}:{sites:ServerSiteRow[]}) {
 const [query,setQuery]=useState(""); const [host,setHost]=useState("all"); const [focus,setFocus]=useState<ServerSiteFocus>("all");
 const [expanded,setExpanded]=useState<string[]>([]);
 const [sort,setSort]=useState<{key:ServerSortKey;direction:SortDirection}>({key:"domain",direction:"asc"});
 const hostMatches=serverSiteMatchesHost;
 const scoped=sites.filter(site=>hostMatches(site,host)&&site.domain.toLowerCase().includes(query.trim().toLowerCase()));
 const filtered=scoped.filter(site=>serverSiteMatchesFocus(site,focus)).sort((a,b)=>compareServerSites(a,b,sort.key,sort.direction));
 const changeSort=(key:ServerSortKey)=>setSort(current=>({key,direction:current.key===key?(current.direction==="asc"?"desc":"asc"):["dailyUsers","weeklyUsers","clicks","impressions","weeklyChange"].includes(key)?"desc":"asc"}));
 return <>
 <div className="workspace-focus" role="group" aria-label="점검 필터">{FOCUS.map(item=><button type="button" key={item.id} aria-pressed={focus===item.id} onClick={()=>setFocus(item.id)}><span>{item.label}</span><strong>{scoped.filter(site=>serverSiteMatchesFocus(site,item.id)).length}</strong><small>{item.note}</small></button>)}</div>
 <div className="server-filters" role="group" aria-label="서버 필터">{[{id:"all",label:"전체 서버"},...hosts.map(id=>({id,label:id==="turbo1"?"Turbo1":id==="turbo2"?"Turbo2":HOST_LABELS[id]})),{id:"unknown",label:"서버 미확인"}].map(item=><button key={item.id} type="button" aria-pressed={host===item.id} onClick={()=>setHost(item.id)}>{item.label}<span>{sites.filter(site=>hostMatches(site,item.id)).length}</span></button>)}</div>
 <div className="server-search"><label htmlFor="server-site-search">사이트 검색</label><input id="server-site-search" type="search" placeholder="도메인을 입력하세요" value={query} onChange={event=>setQuery(event.target.value)}/><span role="status">{filtered.length}개 표시 / 전체 {sites.length}개</span>{(query||host!=="all"||focus!=="all")&&<button type="button" className="workspace-reset" onClick={()=>{setQuery("");setHost("all");setFocus("all");}}>필터 초기화</button>}</div>
 <p className="workspace-table-hint">사이트 아래 ‘상세 보기’에서 30일 사용자·CTR·평균 순위·호스팅 확인 시각을 확인하세요.</p>
 <div className="server-table-wrap" role="region" aria-label="사이트 운영 통계 표, 가로 스크롤 가능" tabIndex={0}>
 <table className="server-table workspace-table" aria-label="사이트 운영 통계"><thead><tr>{COLUMNS.map(column=><th key={column.key} scope="col" aria-sort={sort.key===column.key?(sort.direction==="asc"?"ascending":"descending"):"none"}><button type="button" onClick={()=>changeSort(column.key)}>{column.label}<span aria-hidden="true">{sort.key===column.key?(sort.direction==="asc"?"↑":"↓"):"↕"}</span></button></th>)}</tr></thead>
 <tbody>{filtered.map(site=>{const issues=getServerSiteIssues(site); const open=expanded.includes(site.domain); const detailsId=`detail-${site.domain.replace(/[^a-z0-9-]/gi,"-")}`;
 return <Fragment key={site.domain}><tr><th scope="row" className="workspace-domain"><a href={site.url} target="_blank" rel="noreferrer">{site.domain} ↗</a><div className="workspace-issues">{issues.length?issues.slice(0,2).map(issue=><span key={issue}>{issue}</span>):<span className="workspace-no-issue">수집된 항목 내 특이사항 없음</span>}{issues.length>2&&<span>외 {issues.length-2}건</span>}</div><button className="workspace-detail-toggle" type="button" aria-label={`${open?"상세 닫기":"상세 보기"} ${site.domain}`} aria-expanded={open} aria-controls={detailsId} onClick={()=>setExpanded(current=>open?current.filter(domain=>domain!==site.domain):[...current,site.domain])}>{open?"상세 닫기":"상세 보기"}</button></th>
 <td><span className={`server-badge server-${site.host}`}>{HOST_LABELS[site.host]??"미확인"}</span>{!!site.stagingTargets?.length&&<small className="workspace-stage">비공개 준비본</small>}</td>
 <td className={site.httpStatus==null||site.httpStatus>=400?"workspace-check":""}>{site.httpStatus??"미확인"}</td>
 <td className="server-number">{number(site.dailyUsers)}</td><td className="server-number">{number(site.weeklyUsers)}</td>
 <td className={`server-number ${site.weeklyChange==null?"":site.weeklyChange<0?"workspace-falling":"workspace-growing"}`}>{percent(site.weeklyChange)}</td>
 <td className="server-number">{number(site.clicks)}</td><td className="server-number">{number(site.impressions)}</td>
 <td className="workspace-approval"><span className={`server-approval approval-${site.approval.toLowerCase()}`}>{approval(site.approval)}</span></td></tr>
 <tr id={detailsId} hidden={!open} className="workspace-detail-row"><td colSpan={9}><div className="workspace-detail-grid"><div><strong>트래픽</strong><p>30일 사용자 {number(site.monthlyUsers)}</p><p>직전 7일 사용자 {number(site.previousWeeklyUsers)}</p><p>GA4 수집: {collectionLabel(site.ga4Status)}</p></div><div><strong>검색</strong><p>CTR {site.ctr==null?"미확인":`${(site.ctr*100).toFixed(2)}%`}</p><p>평균 순위 {site.position==null?"미확인":site.position.toFixed(1)}</p><p>GSC 수집: {collectionLabel(site.gscStatus)}</p></div><div><strong>호스팅 확인</strong><p>{time(site.checkedAt)}</p><p>{verified(site)?"공개 호스팅 경로 확인":"공개 원본·목적지 확인 필요"}</p>{site.stagingTargets?.map(stage=><p key={`${stage.host}-${stage.checkedAt}`}>준비본 {HOST_LABELS[stage.host]??stage.host} · {time(stage.checkedAt)}</p>)}</div><div><strong>확인 사항</strong>{issues.length?issues.map(issue=><p key={issue}>{issue}</p>):<p>수집된 항목 내 특이사항 없음</p>}<p>AdSense 계정: {approval(site.approval)}</p><small>정확한 도메인 기준이며 코드 설치·ads.txt와 별개입니다.</small></div></div></td></tr></Fragment>;
 })}{!filtered.length&&<tr><td colSpan={9} className="server-empty">조건에 맞는 사이트가 없습니다. 필터를 초기화해 보세요.</td></tr>}</tbody></table></div>
 </>;
}
