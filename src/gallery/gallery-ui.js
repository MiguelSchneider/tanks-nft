// ── GALLERY UI ──────────────────────────────────────────────────────────────
// DOM rendering for the NFT gallery grid, filters, and detail modal.

import { drawTankAt, renderTankNFTImage } from '../game/renderer.js'
import { calcRarity } from '../game/gene.js'
import { shortenAddr } from '../game/utils.js'
import { COLLECTION, RARITY_ORDER } from './gallery-fetch.js'

const RARITY_COLORS = {
  Legendary: '#FFD700',
  Epic:      '#A855F7',
  Rare:      '#3B82F6',
  Uncommon:  '#22C55E',
  Common:    '#9CA3AF',
}

const EXPLORER_BASE = 'https://explorer.solana.com'

function explorerUrl(addr, type = 'address') {
  return `${EXPLORER_BASE}/${type}/${addr}?cluster=devnet`
}

// ── Status displays ─────────────────────────────────────────────────────────

export function showLoading(msg = 'Loading NFTs...') {
  const el = document.getElementById('galleryStatus')
  el.innerHTML = `<div class="spinner"></div><div class="status-msg">${msg}</div>`
  document.getElementById('galleryContent').style.display = ''
  document.getElementById('galleryGrid').style.display = 'none'
}

export function showError(msg) {
  const el = document.getElementById('galleryStatus')
  el.innerHTML = `<div class="error-msg">${msg}</div>`
  document.getElementById('galleryContent').style.display = ''
  document.getElementById('galleryGrid').style.display = 'none'
}

// ── Card rendering ──────────────────────────────────────────────────────────

function drawCardCanvas(gene, size = 160) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const c = canvas.getContext('2d')

  // Dark background
  const bg = c.createRadialGradient(size / 2, size / 2 - 10, 0, size / 2, size / 2, size * 0.6)
  bg.addColorStop(0, '#1e1e3a')
  bg.addColorStop(1, '#0a0a14')
  c.fillStyle = bg
  c.fillRect(0, 0, size, size)

  // Draw tank centered
  const scale = size / 120
  c.save()
  c.scale(scale, scale)
  drawTankAt(c, gene, 60, 60, 0, 0, 0)
  c.restore()

  return canvas
}

function createCard(nft) {
  const card = document.createElement('div')
  card.className = 'gallery-card'
  card.dataset.rarity = nft.rarity
  card.dataset.name = nft.name.toLowerCase()
  card.dataset.owner = nft.owner.toLowerCase()

  // Tank visual
  if (nft.gene) {
    const canvas = drawCardCanvas(nft.gene)
    card.appendChild(canvas)
  } else if (nft.imageUrl) {
    const img = document.createElement('img')
    img.src = nft.imageUrl
    img.alt = nft.name
    img.loading = 'lazy'
    card.appendChild(img)
  } else {
    const placeholder = document.createElement('div')
    placeholder.style.cssText = 'width:100%;aspect-ratio:1;background:#1a1a0a;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#333;font-size:32px;'
    placeholder.textContent = '?'
    card.appendChild(placeholder)
  }

  // Name
  const nameEl = document.createElement('div')
  nameEl.className = 'gallery-card-name'
  nameEl.textContent = nft.name
  card.appendChild(nameEl)

  // Rarity
  const rarityEl = document.createElement('div')
  rarityEl.className = 'gallery-card-rarity'
  const color = RARITY_COLORS[nft.rarity] || RARITY_COLORS.Common
  rarityEl.innerHTML = `<span class="rarity-dot" style="background:${color}"></span><span style="color:${color}">${nft.rarity}</span>`
  card.appendChild(rarityEl)

  // Owner
  const ownerEl = document.createElement('div')
  ownerEl.className = 'gallery-card-owner'
  if (nft.owner !== 'Unknown') {
    ownerEl.innerHTML = `Owner: <a href="${explorerUrl(nft.owner)}" target="_blank" title="${nft.owner}">${shortenAddr(nft.owner)}</a>`
  } else {
    ownerEl.textContent = 'Owner: Unknown'
  }
  card.appendChild(ownerEl)

  // Click → detail modal
  card.addEventListener('click', () => showDetail(nft))

  return card
}

// ── Gallery grid ────────────────────────────────────────────────────────────

let allNFTs = []

export function renderGallery(nfts) {
  allNFTs = nfts

  // Show info bar
  const infoBar = document.getElementById('infoBar')
  infoBar.style.display = ''
  document.getElementById('collectionAddr').textContent = shortenAddr(COLLECTION)
  document.getElementById('collectionAddr').title = COLLECTION
  document.getElementById('totalCount').textContent = `${nfts.length} NFTs`

  // Show filter bar
  document.getElementById('filterBar').style.display = ''

  // Hide status, show grid
  document.getElementById('galleryContent').style.display = 'none'

  if (nfts.length === 0) {
    document.getElementById('galleryContent').style.display = ''
    document.getElementById('galleryStatus').innerHTML = '<div class="status-msg">No NFTs found in this collection.</div>'
    document.getElementById('galleryGrid').style.display = 'none'
    return
  }

  applyFilters()
}

// ── Filters & Sort ──────────────────────────────────────────────────────────

let activeRarity = 'All'
let activeSort = 'owner'
let activeSearch = ''

function groupKey(nft) {
  if (activeSort === 'owner') return nft.owner
  if (activeSort === 'rarity') return nft.rarity
  // name: group by first letter
  return (nft.name[0] || '?').toUpperCase()
}

function groupLabel(key) {
  if (activeSort === 'owner') {
    if (key === 'Unknown') return 'Unknown Owner'
    return `<a href="${explorerUrl(key)}" target="_blank" title="${key}">${shortenAddr(key)}</a>`
  }
  if (activeSort === 'rarity') {
    const color = RARITY_COLORS[key] || RARITY_COLORS.Common
    return `<span class="rarity-dot" style="background:${color}"></span><span style="color:${color}">${key}</span>`
  }
  return key
}

function groupSortOrder(key) {
  if (activeSort === 'rarity') return RARITY_ORDER[key] ?? 4
  return 0 // stable — groups appear in insertion order
}

function applyFilters() {
  let filtered = allNFTs

  // Rarity filter
  if (activeRarity !== 'All') {
    filtered = filtered.filter(n => n.rarity === activeRarity)
  }

  // Search
  if (activeSearch) {
    const q = activeSearch.toLowerCase()
    filtered = filtered.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.owner.toLowerCase().includes(q)
    )
  }

  // Sort within groups
  filtered = [...filtered].sort((a, b) => {
    if (activeSort === 'rarity') {
      const rd = (RARITY_ORDER[a.rarity] ?? 4) - (RARITY_ORDER[b.rarity] ?? 4)
      return rd !== 0 ? rd : a.name.localeCompare(b.name)
    }
    if (activeSort === 'owner') {
      const od = a.owner.localeCompare(b.owner)
      return od !== 0 ? od : a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

  // Build groups
  const groups = new Map()
  for (const nft of filtered) {
    const k = groupKey(nft)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(nft)
  }

  // Re-render
  const grid = document.getElementById('galleryGrid')
  grid.style.display = ''
  grid.innerHTML = ''

  if (filtered.length === 0) {
    const empty = document.createElement('div')
    empty.style.cssText = 'text-align:center;padding:40px;color:#555;font-size:13px;'
    empty.textContent = 'No NFTs match your filters.'
    grid.appendChild(empty)
    return
  }

  for (const [key, nfts] of groups) {
    const section = document.createElement('div')
    section.className = 'gallery-group'

    const header = document.createElement('div')
    header.className = 'group-header'
    header.innerHTML = `<span class="group-label">${groupLabel(key)}</span><span class="group-count">${nfts.length} NFT${nfts.length !== 1 ? 's' : ''}</span>`
    section.appendChild(header)

    const groupGrid = document.createElement('div')
    groupGrid.className = 'group-grid'
    for (const nft of nfts) {
      groupGrid.appendChild(createCard(nft))
    }
    section.appendChild(groupGrid)

    grid.appendChild(section)
  }

  document.getElementById('totalCount').textContent =
    filtered.length === allNFTs.length
      ? `${allNFTs.length} NFTs`
      : `${filtered.length} / ${allNFTs.length} NFTs`
}

export function setupFilters() {
  // Rarity buttons
  document.getElementById('rarityFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('.rarity-btn')
    if (!btn) return
    activeRarity = btn.dataset.rarity
    document.querySelectorAll('.rarity-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    applyFilters()
  })

  // Sort select
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    activeSort = e.target.value
    applyFilters()
  })

  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    activeSearch = e.target.value
    applyFilters()
  })
}

// ── Detail modal ────────────────────────────────────────────────────────────

function showDetail(nft) {
  const overlay = document.getElementById('detailOverlay')
  const card = document.getElementById('detailCard')
  card.innerHTML = ''

  // Top section: image + meta
  const top = document.createElement('div')
  top.className = 'detail-top'

  // Canvas or image
  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'detail-canvas-wrap'
  if (nft.gene) {
    const nftCanvas = renderTankNFTImage(nft.gene, nft.name)
    nftCanvas.style.cssText = 'width:200px;height:200px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);'
    canvasWrap.appendChild(nftCanvas)
  } else if (nft.imageUrl) {
    const img = document.createElement('img')
    img.src = nft.imageUrl
    img.alt = nft.name
    canvasWrap.appendChild(img)
  }
  top.appendChild(canvasWrap)

  // Meta
  const meta = document.createElement('div')
  meta.className = 'detail-meta'

  const nameEl = document.createElement('div')
  nameEl.className = 'detail-name'
  nameEl.textContent = nft.name
  meta.appendChild(nameEl)

  const color = RARITY_COLORS[nft.rarity] || RARITY_COLORS.Common
  const rarityEl = document.createElement('div')
  rarityEl.className = 'detail-rarity'
  rarityEl.innerHTML = `<span class="rarity-dot" style="background:${color}"></span><span style="color:${color}">${nft.rarity}</span>`
  meta.appendChild(rarityEl)

  // Owner field
  const ownerField = document.createElement('div')
  ownerField.className = 'detail-field'
  ownerField.innerHTML = `Owner: <a href="${explorerUrl(nft.owner)}" target="_blank">${nft.owner}</a>`
  meta.appendChild(ownerField)

  // Mint address field
  const mintField = document.createElement('div')
  mintField.className = 'detail-field'
  mintField.innerHTML = `Mint: <a href="${explorerUrl(nft.mintAddress, 'address')}" target="_blank">${nft.mintAddress}</a>`
  meta.appendChild(mintField)

  // Stats from gene
  if (nft.gene) {
    const statsDiv = document.createElement('div')
    statsDiv.className = 'detail-stats'
    statsDiv.style.marginTop = '10px'
    const stats = [
      { label: 'HP', val: Math.round(nft.gene.maxHp), max: 180 },
      { label: 'Speed', val: nft.gene.moveSpeed.toFixed(1), max: 3.2 },
      { label: 'Damage', val: Math.round(nft.gene.bulletDmg), max: 52 },
      { label: 'Fire Rate', val: nft.gene.fireRate.toFixed(1), max: 3.5 },
      { label: 'Bullet Spd', val: nft.gene.bulletSpd.toFixed(1), max: 10 },
      { label: 'Fuel', val: Math.round(nft.gene.maxFuel), max: 2400 },
    ]
    for (const s of stats) {
      const pct = Math.min(100, (parseFloat(s.val) / s.max) * 100)
      statsDiv.innerHTML += `
        <div class="detail-stat">
          ${s.label}: <span>${s.val}</span>
          <div class="detail-stat-bar"><div class="detail-stat-fill" style="width:${pct}%"></div></div>
        </div>`
    }
    meta.appendChild(statsDiv)
  }

  top.appendChild(meta)
  card.appendChild(top)

  // Traits from attributes
  if (nft.attributes.length > 0) {
    const traitsDiv = document.createElement('div')
    traitsDiv.className = 'detail-traits'
    const traitTypes = ['Body Shape', 'Turret Shape', 'Barrel Type', 'Track Type']
    for (const attr of nft.attributes) {
      if (traitTypes.includes(attr.trait_type)) {
        const tag = document.createElement('span')
        tag.className = 'detail-trait'
        tag.innerHTML = `${attr.trait_type}: <span>${attr.value}</span>`
        traitsDiv.appendChild(tag)
      }
    }
    if (traitsDiv.children.length > 0) {
      card.appendChild(traitsDiv)
    }
  }

  // Footer
  const footer = document.createElement('div')
  footer.className = 'detail-footer'
  const closeBtn = document.createElement('button')
  closeBtn.textContent = 'Close'
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'))
  footer.appendChild(closeBtn)
  card.appendChild(footer)

  // Show
  overlay.classList.add('open')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open')
  }, { once: true })
}
