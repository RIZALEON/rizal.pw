/* rassm.js v1 (2026-10-29) — ASSM PROFILE CARD twin of the bio bot card. LAW-PTS-1 Profile Twin Sync:
 * every profile save (edit command, plain-English edit, inline Save) also rewrites the ASSM card. Public fields only. */
(function(root){"use strict";var K="rassm.card",F=["name","handle","bio","location","link","links","joined","biosrc"];
function build(prof,bio){prof=prof||{};var p={};F.forEach(function(k){var v=prof[k];if(k==="links"){try{v=typeof v==="string"?JSON.parse(v||"[]"):(v||[])}catch(e){v=[]}}p[k]=v==null?"":v});
 return {schema:"ya.assm-profile.v1",card:"ASSM PROFILE CARD",law:"LAW-PTS-1",handle:p.handle||(bio&&bio.handle)||"",rid:(bio&&bio.rid)||"ЯID-0001-3QQS",profile:p,
  linked_card:{card:"BIOBOT / bio bot card",path:"/data/founder/bio-source.json",name:p.name||(bio&&bio.name)||"",handle:p.handle||(bio&&bio.handle)||""},updated:new Date().toISOString()}}
function sync(prof,changed){var c=build(prof,root.RBIOSOURCE&&root.RBIOSOURCE.record?root.RBIOSOURCE.record():null);c.changed=changed||[];try{root.localStorage&&root.localStorage.setItem(K,JSON.stringify(c))}catch(e){}return c}
function card(){try{return JSON.parse(root.localStorage.getItem(K)||"null")}catch(e){return null}}
var api={VERSION:1,FIELDS:F,build:build,sync:sync,card:card};if(typeof module==="object"&&module.exports)module.exports=api;else root.RASSM=api})(typeof window!=="undefined"?window:globalThis);
