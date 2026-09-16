import { useEffect, useMemo, useState } from 'react'
import bookingsHero from './assets/bookings-hero.png'
import borrowersHero from './assets/borrowers-hero.svg'
import reportsHero from './assets/reports-hero.svg'
import equipmentHero from './assets/equipment-hero.svg'
import settingsHero from './assets/settings-hero.svg'
import cameraGear from './assets/camera-gear.svg'
import projectorGear from './assets/projector-gear.svg'
import audioGear from './assets/audio-gear.svg'
import lightingGear from './assets/lighting-gear.svg'
import accessoryGear from './assets/accessory-gear.svg'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const navItems = ['Overview', 'Bookings', 'Equipment', 'Borrowers', 'Reports', 'Settings']
const colors = ['coral', 'teal', 'yellow', 'blue']
const pageHero = {
    Bookings: { image: bookingsHero, eyebrow: 'LOAN OPERATIONS', chips: ['Approvals', 'Transfers', 'Returns'] },
    Equipment: { image: equipmentHero, eyebrow: 'INVENTORY CONTROL', chips: ['Availability', 'Deposits', 'Condition'] },
    Borrowers: { image: borrowersHero, eyebrow: 'ACCOUNTABILITY', chips: ['Borrower records', 'History', 'Contacts'] },
    Reports: { image: reportsHero, eyebrow: 'ANALYTICS', chips: ['Utilization', 'Deposits', 'Trends'] },
    Settings: { image: settingsHero, eyebrow: 'WORKSPACE CONTROL', chips: ['Theme', 'Density', 'Accent'] },
}
const equipmentImagePositions = {
    Cameras: 'center',
    Projectors: 'center',
    Audio: 'center',
    Lighting: 'center',
    Other: 'center',
}
const equipmentImages = {
    Cameras: cameraGear,
    Projectors: projectorGear,
    Audio: audioGear,
    Lighting: lightingGear,
    Other: accessoryGear,
}

function normalizeEquipment(item, index = 0) {
    return {
        key: item._id || item.equipmentId,
        id: item.equipmentId,
        name: item.name,
        category: item.category,
        units: Number(item.totalUnits || 0),
        available: Number(item.availableUnits || 0),
        deposit: Number(item.depositAmount || 0),
        lateFee: Number(item.lateFeePerDay || 0),
        color: colors[index % colors.length],
        icon: item.category?.slice(0, 2).toUpperCase() || 'AV',
        image: equipmentImages[item.category] || accessoryGear,
        imagePosition: equipmentImagePositions[item.category] || equipmentImagePositions.Other,
    }
}

function normalizeBooking(item, index = 0) {
    const equipment = typeof item.equipment === 'object' ? item.equipment : null
    const borrower = typeof item.borrower === 'object' ? item.borrower : null
    const name = borrower?.name || item.borrowerName || 'Current user'
    const status = label(item.status)
    return {
        key: item._id || `booking-${index}`,
        id: item._id || `BK-${index + 1}`,
        initials: initials(name),
        name,
        equipmentId: equipment?.equipmentId || item.equipmentId || item.equipment,
        item: equipment?.name || item.item || 'Equipment',
        quantity: item.quantity,
        date: `${formatDate(item.borrowDate)} to ${formatDate(item.expectedReturnDate)}`,
        borrow: item.borrowDate,
        due: item.expectedReturnDate,
        status,
        tone: statusTone(status),
    }
}

async function api(path, { token, ...options } = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Request failed')
    return data
}

function App() {
    const [auth, setAuth] = useState(() => {
        try { return JSON.parse(localStorage.getItem('av-room-session')) } catch { return null }
    })
    const [authMode, setAuthMode] = useState('login')
    const [authRole, setAuthRole] = useState('student')
    const [authBusy, setAuthBusy] = useState(false)
    const [authError, setAuthError] = useState('')
    const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', department: '', rollNumber: '' })
    const [active, setActive] = useState('Overview')
    const [inventory, setInventory] = useState([])
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All categories')
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('booking')
    const [toast, setToast] = useState('')
    const [dark, setDark] = useState(false)
    const [compact, setCompact] = useState(false)
    const [accent, setAccent] = useState('teal')
    const [notificationOpen, setNotificationOpen] = useState(false)
    const [form, setForm] = useState({ equipmentId: '', quantity: 1, borrow: today(), due: tomorrow() })
    const [equipmentForm, setEquipmentForm] = useState({ id: '', name: '', category: 'Cameras', units: 1, deposit: 0, lateFee: 0 })
    const [transferBooking, setTransferBooking] = useState(null)
    const [transferForm, setTransferForm] = useState({ name: '', email: '', department: '', rollNumber: '' })

    const isAdmin = auth?.user?.role === 'admin'
    const pending = bookings.filter((booking) => booking.status === 'Pending')
    const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0)
    const availableUnits = inventory.reduce((sum, item) => sum + item.available, 0)
    const filteredInventory = useMemo(() => inventory.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase()) && (category === 'All categories' || item.category === category)), [inventory, search, category])

    function logout() {
        localStorage.removeItem('av-room-session')
        setAuth(null)
        setBookings([])
        setInventory([])
        setAuthForm({ name: '', email: '', password: '', department: '', rollNumber: '' })
    }

    function flash(message) {
        setToast(message)
        window.setTimeout(() => setToast(''), 2600)
    }

    async function refreshData(token = auth?.token) {
        if (!token) return
        setLoading(true)
        try {
            const [equipmentRows, bookingRows] = await Promise.all([
                api('/equipment', { token }),
                api('/bookings', { token }),
            ])
            setInventory(equipmentRows.map(normalizeEquipment))
            setBookings(bookingRows.map(normalizeBooking))
        } catch (error) {
            flash(error.message)
            if (error.message.toLowerCase().includes('auth')) logout()
        } finally {
            setLoading(false)
        }
    }

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (!auth) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshData(auth.token)
    }, [auth])
    /* eslint-enable react-hooks/exhaustive-deps */

    const submitAuth = async (event) => {
        event.preventDefault()
        setAuthBusy(true)
        setAuthError('')
        try {
            const endpoint = authRole === 'admin' ? '/auth/admin/login' : authMode === 'register' ? '/auth/register' : '/auth/login'
            const data = await api(endpoint, { method: 'POST', body: JSON.stringify(authForm) })
            const session = { token: data.token, user: data.user }
            localStorage.setItem('av-room-session', JSON.stringify(session))
            setAuth(session)
            setActive('Overview')
        } catch (error) {
            setAuthError(error.message)
        } finally {
            setAuthBusy(false)
        }
    }

    const openBooking = () => {
        setModalMode('booking')
        setShowModal(true)
    }

    const submitBooking = async (event) => {
        event.preventDefault()
        const selectedEquipmentId = form.equipmentId || inventory[0]?.id
        if (!selectedEquipmentId) return flash('Choose equipment first')
        if (!form.borrow || !form.due || new Date(form.due) <= new Date(form.borrow)) return flash('Return date must be after the borrow date')
        try {
            await api('/bookings', {
                token: auth.token,
                method: 'POST',
                body: JSON.stringify({ equipmentId: selectedEquipmentId, quantity: Number(form.quantity), borrowDate: form.borrow, expectedReturnDate: form.due }),
            })
            setShowModal(false)
            flash('Booking request created')
            refreshData()
        } catch (error) {
            flash(error.message)
        }
    }

    const adminAction = async (path, success) => {
        try {
            await api(path, { token: auth.token, method: 'PATCH', body: JSON.stringify({}) })
            flash(success)
            refreshData()
        } catch (error) {
            flash(error.message)
        }
    }

    const openTransfer = (booking) => {
        setTransferBooking(booking)
        setTransferForm({ name: '', email: '', department: '', rollNumber: '' })
        setModalMode('transfer')
        setShowModal(true)
    }

    const submitTransfer = async (event) => {
        event.preventDefault()
        if (!transferBooking) return
        try {
            await api(`/bookings/${transferBooking.id}/transfer`, {
                token: auth.token,
                method: 'PATCH',
                body: JSON.stringify(transferForm),
            })
            setShowModal(false)
            setTransferBooking(null)
            flash('Loan transferred. Due date and availability are unchanged')
            refreshData()
        } catch (error) {
            flash(error.message)
        }
    }

    const addEquipment = async (event) => {
        event.preventDefault()
        if (!isAdmin) return flash('Only admins can add equipment')
        if (!equipmentForm.id || !equipmentForm.name || Number(equipmentForm.units) < 1) return flash('Equipment ID, name, and units are required')
        try {
            await api('/equipment', {
                token: auth.token,
                method: 'POST',
                body: JSON.stringify({
                    equipmentId: equipmentForm.id.trim().toUpperCase(),
                    name: equipmentForm.name.trim(),
                    category: equipmentForm.category,
                    totalUnits: Number(equipmentForm.units),
                    depositAmount: Number(equipmentForm.deposit),
                    lateFeePerDay: Number(equipmentForm.lateFee),
                }),
            })
            setEquipmentForm({ id: '', name: '', category: 'Cameras', units: 1, deposit: 0, lateFee: 0 })
            setShowModal(false)
            flash('Equipment added to inventory')
            refreshData()
        } catch (error) {
            flash(error.message)
        }
    }

    const pageContent = () => {
        if (loading) return <div className="empty-state">Loading workspace...</div>
        if (active === 'Bookings') return <BookingsPage isAdmin={isAdmin} bookings={bookings} onApprove={(id) => adminAction(`/bookings/${id}/approve`, 'Booking approved')} onReject={(id) => adminAction(`/bookings/${id}/reject`, 'Booking rejected')} onReturn={(id) => adminAction(`/bookings/${id}/return`, 'Return processed')} onTransfer={openTransfer} onNew={openBooking} />
        if (active === 'Equipment') return <EquipmentPage isAdmin={isAdmin} inventory={filteredInventory} search={search} setSearch={setSearch} category={category} setCategory={setCategory} onAdd={() => { setModalMode('equipment'); setShowModal(true) }} onArchive={(id) => adminAction(`/equipment/${id}/archive`, 'Equipment archived')} />
        if (active === 'Borrowers') return <BorrowersPage bookings={bookings} />
        if (active === 'Reports') return <ReportsPage inventory={inventory} bookings={bookings} />
        if (active === 'Settings') return <SettingsPage auth={auth} dark={dark} setDark={setDark} compact={compact} setCompact={setCompact} accent={accent} setAccent={setAccent} pending={pending.length} availableUnits={availableUnits} totalUnits={totalUnits} />
        return <Overview isAdmin={isAdmin} inventory={filteredInventory} bookings={bookings} search={search} setSearch={setSearch} category={category} setCategory={setCategory} onNew={openBooking} onApprove={(id) => adminAction(`/bookings/${id}/approve`, 'Booking approved')} onReturn={(id) => adminAction(`/bookings/${id}/return`, 'Return processed')} onTransfer={openTransfer} onBookings={() => setActive('Bookings')} onEquipment={() => setActive('Equipment')} totalUnits={totalUnits} availableUnits={availableUnits} />
    }

    if (!auth) return <AuthScreen mode={authMode} role={authRole} form={authForm} error={authError} busy={authBusy} setMode={setAuthMode} setRole={setAuthRole} setForm={setAuthForm} onSubmit={submitAuth} />

    return <div className={`app-shell accent-${accent} ${dark ? 'dark' : ''} ${compact ? 'compact-ui' : ''}`}>
        <aside className="sidebar">
            <div className="brand"><span className="brand-mark">A</span><span>AV<span className="muted-brand">/</span>ROOM</span></div>
            <div className="workspace-label">{isAdmin ? 'ADMIN WORKSPACE' : 'USER WORKSPACE'}</div>
            <nav>{navItems.map((item) => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}><span className="nav-icon">{navIcon(item)}</span>{item}{item === 'Bookings' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}</nav>
            <div className="sidebar-bottom">
                <div className="help-box"><strong>{isAdmin ? 'Admin access' : 'User access'}</strong><span>{isAdmin ? 'Review bookings and inventory.' : 'Create and track your requests.'}</span></div>
                <button className="profile logout-button" onClick={logout}><span className="avatar avatar-blue">{initials(auth.user?.name || 'User')}</span><span><strong>{auth.user?.name || 'User'}</strong><small>{isAdmin ? 'Administrator' : 'Student'}</small></span><span className="dots">Logout</span></button>
            </div>
        </aside>
        <main className="main-content">
            <header className="topbar"><div className="mobile-brand"><span className="brand-mark">A</span>AV/ROOM</div><div className="breadcrumb">Workspace <span>/</span> {active}</div><div className="top-actions"><button className="icon-button" aria-label="Open settings" onClick={() => setActive('Settings')}>Settings</button><button className="icon-button" aria-label="Toggle theme" onClick={() => setDark((value) => !value)}>{dark ? 'Light' : 'Dark'}</button><div className="notification-wrap"><button className="notification" aria-label="Notifications" onClick={() => setNotificationOpen((value) => !value)}>Alerts{pending.length > 0 && <i />}</button>{notificationOpen && <div className="notification-popover"><strong>Notifications</strong><span>{pending.length} pending booking(s)</span><span>{inventory.filter((item) => item.available === 0).length} item(s) fully borrowed</span></div>}</div><div className="top-avatar">{initials(auth.user?.name || 'User')}</div></div></header>
            {active === 'Overview' && <section className="page-heading hero-panel"><div className="hero-copy"><div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div><h1>Good morning, {auth.user?.name?.split(' ')[0] || 'there'}</h1><p>{isAdmin ? 'Review requests and keep the AV room moving.' : 'Reserve equipment and follow your booking status.'}</p><div className="hero-chips"><span>{availableUnits} ready now</span><span>{totalUnits - availableUnits} in circulation</span><span>{pending.length} pending</span></div></div><button className="primary-button" onClick={openBooking}>New booking</button></section>}
            {pageContent()}
        </main>
        {showModal && <Modal modalMode={modalMode} inventory={inventory} form={form} setForm={setForm} equipmentForm={equipmentForm} setEquipmentForm={setEquipmentForm} transferBooking={transferBooking} transferForm={transferForm} setTransferForm={setTransferForm} onClose={() => setShowModal(false)} onBooking={submitBooking} onEquipment={addEquipment} onTransfer={submitTransfer} />}
        {toast && <div className="toast">OK: {toast}</div>}
    </div>
}

function Header({ title, subtitle, action, actionLabel }) {
    const hero = pageHero[title]
    if (hero) return <section className={`page-hero page-hero-${title.toLowerCase()}`} style={{ '--page-image': `url(${hero.image})` }}><div><div className="eyebrow">{hero.eyebrow}</div><h2>{title}</h2><p>{subtitle}</p><div className="page-hero-chips">{hero.chips.map((chip) => <span key={chip}>{chip}</span>)}</div></div>{action && <button className="primary-button" onClick={action}>{actionLabel}</button>}</section>
    return <section className="section-header page-section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="primary-button" onClick={action}>{actionLabel}</button>}</section>
}
function EquipmentCards({ inventory, onArchive, isAdmin = false }) { if (!inventory.length) return <div className="empty-state">No equipment found.</div>; return <div className="equipment-grid">{inventory.map((item) => <article className="equipment-card" key={item.id}><div className={`equipment-thumb ${item.color}`} style={{ '--thumb-image': `url(${item.image})`, '--thumb-position': item.imagePosition }}><span>{item.icon}</span><small>{item.id}</small></div><div className="equipment-info"><div><h3>{item.name}</h3><span className="category-text">{item.category}</span></div><div className="availability-row"><span className="availability-dot" /> <strong>{item.available} of {item.units} available</strong></div></div>{isAdmin && <button className="more-button" onClick={() => onArchive(item.id)} aria-label={`Archive ${item.name}`}>Archive</button>}</article>)}</div> }
function Overview({ isAdmin, inventory, bookings, search, setSearch, category, setCategory, onApprove, onReturn, onTransfer, onBookings, onEquipment, totalUnits, availableUnits }) { const pending = bookings.filter((item) => item.status === 'Pending'); return <><section className="stats-grid"><Stat label="EQUIPMENT UNITS" value={totalUnits} note="Total inventory" tone="up" icon="#" /><Stat label="CURRENTLY BORROWED" value={totalUnits - availableUnits} note={`of ${totalUnits} items in circulation`} icon=">" /><Stat label="PENDING REQUESTS" value={pending.length} note={isAdmin ? 'Needs review' : 'Awaiting admin'} tone="warn" icon="!" /><Stat label="AVAILABLE NOW" value={availableUnits} note="Ready to issue" tone="up" icon="+" /></section><section className="section-header"><div><h2>Availability</h2><p>Find equipment and plan the next booking.</p></div><button className="text-button" onClick={onEquipment}>View all equipment</button></section><section className="availability-panel"><SearchBar search={search} setSearch={setSearch} category={category} setCategory={setCategory} /><EquipmentCards inventory={inventory} /></section><div className="lower-grid"><section className="queue-section"><div className="section-header compact"><div><h2>Booking queue <span className="pill-count">{pending.length}</span></h2><p>{isAdmin ? 'Requests waiting for review.' : 'Your latest booking requests.'}</p></div><button className="text-button" onClick={onBookings}>View all</button></div><BookingTable isAdmin={isAdmin} bookings={bookings.slice(0, 4)} onApprove={onApprove} onReturn={onReturn} onTransfer={onTransfer} /></section><Activity bookings={bookings} /></div><footer><span><i className="live-dot" /> API connected</span><span>Last synced just now</span></footer></> }
function Stat({ label, value, note, tone = '', icon }) { return <div className="stat-card"><div className="stat-label">{label}<span className={`stat-icon ${tone}-icon`}>{icon}</span></div><strong>{value}</strong><span className={`stat-note ${tone}`}>{note}</span></div> }
function SearchBar({ search, setSearch, category, setCategory }) { return <div className="availability-search"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search equipment by name or ID..." /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option><option>Cameras</option><option>Projectors</option><option>Audio</option><option>Lighting</option><option>Other</option></select><button className="filter-button" onClick={() => { setSearch(''); setCategory('All categories') }}>Reset</button></div> }
function BookingTable({ isAdmin, bookings, onApprove, onReject, onReturn, onTransfer }) { if (!bookings.length) return <div className="empty-state">No bookings yet.</div>; return <div className="table-wrap"><table><thead><tr><th>REQUESTER</th><th>EQUIPMENT</th><th>DATES</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id}><td><div className="requester"><span className={`avatar avatar-${booking.tone}`}>{booking.initials}</span><strong>{booking.name}</strong></div></td><td>{booking.item} x {booking.quantity}</td><td>{booking.date}</td><td><span className={`status ${booking.tone}`}>{booking.status}</span></td><td>{isAdmin && booking.status === 'Pending' && <span className="action-group"><button className="approve-button" onClick={() => onApprove(booking.id)}>Approve</button><button className="reject-button" onClick={() => onReject?.(booking.id)}>Reject</button></span>}{isAdmin && isActiveLoan(booking.status) && <span className="action-group"><button className="approve-button" onClick={() => onReturn(booking.id)}>Return</button><button className="filter-button" onClick={() => onTransfer?.(booking)}>Transfer</button></span>}{!isAdmin && <span className="complete-label">Tracked</span>}{booking.status === 'Returned' && <span className="complete-label">Complete</span>}</td></tr>)}</tbody></table></div> }
function BookingsPage({ isAdmin, bookings, onApprove, onReject, onReturn, onTransfer, onNew }) { return <><Header title="Bookings" subtitle={isAdmin ? 'Review requests, issue equipment, transfer active loans, and process returns.' : 'Create requests and track your booking status.'} action={onNew} actionLabel="New booking" /><div className="page-panel"><BookingTable isAdmin={isAdmin} bookings={bookings} onApprove={onApprove} onReject={onReject} onReturn={onReturn} onTransfer={onTransfer} /></div>{isAdmin && <><Header title="Return desk" subtitle="Approved equipment currently in circulation." /><div className="return-grid">{bookings.filter((item) => item.status === 'Approved').map((item) => <div className="return-card" key={item.id}><div><strong>{item.item}</strong><span>{item.name} due {formatDate(item.due)}</span></div><span className="action-group"><button className="filter-button" onClick={() => onTransfer(item)}>Transfer</button><button className="approve-button" onClick={() => onReturn(item.id)}>Process return</button></span></div>)}</div></>}</> }
function EquipmentPage({ isAdmin, inventory, search, setSearch, category, setCategory, onAdd, onArchive }) { return <><Header title="Equipment" subtitle="Manage inventory, availability, deposits, and condition." action={isAdmin ? onAdd : null} actionLabel="Add equipment" /><section className="availability-panel page-equipment"><SearchBar search={search} setSearch={setSearch} category={category} setCategory={setCategory} /><EquipmentCards inventory={inventory} onArchive={onArchive} isAdmin={isAdmin} /></section></> }
function BorrowersPage({ bookings }) { const people = [...new Map(bookings.map((booking) => [booking.name, booking])).values()]; return <><Header title="Borrowers" subtitle="Accountability across current and historical borrowers." /><div className="borrower-grid">{people.map((person) => <article className="borrower-card" key={person.name}><span className="avatar avatar-blue">{person.initials}</span><div><h3>{person.name}</h3><p>Registered borrower</p><span>{bookings.filter((item) => item.name === person.name).length} booking(s)</span></div></article>)}</div></> }
function ReportsPage({ inventory, bookings }) { const returned = bookings.filter((item) => item.status === 'Returned').length; const approved = bookings.filter((item) => item.status === 'Approved').length; const total = Math.max(1, inventory.reduce((sum, item) => sum + item.units, 0)); return <><Header title="Reports" subtitle="A quick operational view of utilization and deposits." /><div className="report-grid"><div className="report-card"><span>UTILIZATION</span><strong>{Math.round((inventory.reduce((sum, item) => sum + item.units - item.available, 0) / total) * 100)}%</strong><p>Units currently in circulation</p></div><div className="report-card"><span>APPROVAL RATE</span><strong>{bookings.length ? Math.round(((approved + returned) / bookings.length) * 100) : 0}%</strong><p>Requests approved or completed</p></div><div className="report-card"><span>DEPOSITS HELD</span><strong>Rs {bookings.filter((item) => item.status !== 'Returned').reduce((sum, item) => sum + (inventory.find((entry) => entry.id === item.equipmentId)?.deposit || 0) * item.quantity, 0).toLocaleString()}</strong><p>Refundable deposits in circulation</p></div></div><div className="report-table"><h3>Equipment utilization</h3>{inventory.map((item) => <div className="bar-row" key={item.id}><span>{item.name}</span><div><i style={{ width: `${item.units ? ((item.units - item.available) / item.units) * 100 : 0}%` }} /></div><strong>{item.units - item.available}/{item.units}</strong></div>)}</div></> }
function Activity({ bookings }) { return <section className="activity-section"><div className="section-header compact"><div><h2>Recent activity</h2><p>Latest booking updates.</p></div></div>{bookings.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><span className={`avatar avatar-${item.tone}`}>{item.initials}</span><div><strong>{item.name}</strong><span>{item.item} is {item.status.toLowerCase()}</span></div><span className="activity-arrow">{item.status}</span></div>)}</section> }

function SettingsPage({ auth, dark, setDark, compact, setCompact, accent, setAccent, pending, availableUnits, totalUnits }) {
    return <><Header title="Settings" subtitle="Tune the workspace so daily AV operations feel fast, clear, and comfortable." /><section className="settings-layout"><div className="settings-panel profile-panel"><div className="settings-photo" /><div><div className="eyebrow">SIGNED IN</div><h3>{auth.user?.name || 'AV Room user'}</h3><p>{auth.user?.email || 'No email on file'}</p><span>{auth.user?.role === 'admin' ? 'Administrator access' : 'Student access'}</span></div></div><div className="settings-panel"><div className="settings-heading"><div><h3>Appearance</h3><p>Pick a bold look for the dashboard.</p></div></div><label className="setting-row"><span><strong>Dark mode</strong><small>Use a deeper interface for low-light rooms.</small></span><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} /></label><label className="setting-row"><span><strong>Compact layout</strong><small>Reduce vertical spacing for busy desks.</small></span><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /></label><div className="accent-picker"><strong>Accent color</strong><div>{['teal', 'coral', 'yellow', 'blue'].map((item) => <button key={item} className={accent === item ? `swatch ${item} selected` : `swatch ${item}`} aria-label={`${item} accent`} onClick={() => setAccent(item)} />)}</div></div></div><div className="settings-panel"><div className="settings-heading"><div><h3>Workspace snapshot</h3><p>Key operating signals at a glance.</p></div></div><div className="snapshot-grid"><span><strong>{availableUnits}</strong>Ready now</span><span><strong>{Math.max(0, totalUnits - availableUnits)}</strong>Borrowed</span><span><strong>{pending}</strong>Pending</span></div></div><div className="settings-panel image-panel"><div><div className="eyebrow">ROOM STANDARD</div><h3>Keep each handoff documented.</h3><p>Deposits, due dates, transfer history, and return checks stay visible across the workspace.</p></div></div></section></>
}

function Modal({ modalMode, inventory, form, setForm, equipmentForm, setEquipmentForm, transferBooking, transferForm, setTransferForm, onClose, onBooking, onEquipment, onTransfer }) {
    if (modalMode === 'transfer') return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}>x</button><form onSubmit={onTransfer}><div className="eyebrow">TRANSFER ACTIVE LOAN</div><h2>Transfer borrower</h2><p>{transferBooking?.item} stays due on {formatDate(transferBooking?.due)}. Availability will not change.</p><label>New borrower name<input value={transferForm.name} onChange={(event) => setTransferForm({ ...transferForm, name: event.target.value })} placeholder="Borrower name" required /></label><label>New borrower email<input type="email" value={transferForm.email} onChange={(event) => setTransferForm({ ...transferForm, email: event.target.value })} placeholder="borrower@college.edu" required /></label><div className="modal-fields"><label>Department<input value={transferForm.department} onChange={(event) => setTransferForm({ ...transferForm, department: event.target.value })} placeholder="Department" /></label><label>Roll number<input value={transferForm.rollNumber} onChange={(event) => setTransferForm({ ...transferForm, rollNumber: event.target.value })} placeholder="Optional" /></label></div><button className="primary-button full" type="submit">Transfer loan</button></form></div></div>
    return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}>x</button>{modalMode === 'booking' ? <form onSubmit={onBooking}><div className="eyebrow">NEW REQUEST</div><h2>Create a booking</h2><p>Reserve equipment for your production window.</p><label>Equipment<select value={form.equipmentId || inventory[0]?.id || ''} onChange={(event) => setForm({ ...form, equipmentId: event.target.value })}>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.available} available)</option>)}</select></label><div className="modal-fields"><label>Quantity<input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><label>Borrow date<input type="date" value={form.borrow} onChange={(event) => setForm({ ...form, borrow: event.target.value })} /></label></div><label>Expected return<input type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} /></label><button className="primary-button full" type="submit">Create booking</button></form> : <form onSubmit={onEquipment}><div className="eyebrow">INVENTORY</div><h2>Add equipment</h2><p>Create an available equipment record.</p><div className="modal-fields"><label>Equipment ID<input value={equipmentForm.id} onChange={(event) => setEquipmentForm({ ...equipmentForm, id: event.target.value.toUpperCase() })} required /></label><label>Category<select value={equipmentForm.category} onChange={(event) => setEquipmentForm({ ...equipmentForm, category: event.target.value })}><option>Cameras</option><option>Projectors</option><option>Audio</option><option>Lighting</option><option>Other</option></select></label></div><label>Name<input value={equipmentForm.name} onChange={(event) => setEquipmentForm({ ...equipmentForm, name: event.target.value })} required /></label><div className="modal-fields"><label>Total units<input type="number" min="1" value={equipmentForm.units} onChange={(event) => setEquipmentForm({ ...equipmentForm, units: event.target.value })} /></label><label>Deposit<input type="number" min="0" value={equipmentForm.deposit} onChange={(event) => setEquipmentForm({ ...equipmentForm, deposit: event.target.value })} /></label></div><label>Late fee per day<input type="number" min="0" value={equipmentForm.lateFee} onChange={(event) => setEquipmentForm({ ...equipmentForm, lateFee: event.target.value })} /></label><button className="primary-button full" type="submit">Add equipment</button></form>}</div></div>
}

function AuthScreen({ mode, role, form, error, busy, setMode, setRole, setForm, onSubmit }) {
    const registering = mode === 'register' && role === 'student'
    return <div className="auth-shell"><div className="auth-aside"><div className="brand auth-brand"><span className="brand-mark">A</span><span>AV<span className="muted-brand">/</span>ROOM</span></div><div><div className="eyebrow">CAMPUS AV OPERATIONS</div><h1>Make every production count.</h1><p>Borrow smarter, keep track of every asset, and give creative teams room to move.</p></div><span className="auth-aside-footer">Secure equipment lending for your campus.</span></div><main className="auth-main"><div className="auth-card"><div className="auth-tabs"><button type="button" className={role === 'student' ? 'selected' : ''} onClick={() => { setRole('student'); setMode('login'); setForm({ ...form, password: '' }) }}>User</button><button type="button" className={role === 'admin' ? 'selected' : ''} onClick={() => { setRole('admin'); setMode('login'); setForm({ ...form, password: '' }) }}>Admin</button></div><div className="eyebrow">{role === 'admin' ? 'ADMIN LOGIN' : registering ? 'USER REGISTRATION' : 'USER LOGIN'}</div><h2>{role === 'admin' ? 'Admin login' : registering ? 'Create user account' : 'User login'}</h2><p className="auth-subtitle">{role === 'admin' ? 'Admins manage inventory, bookings, and returns.' : registering ? 'Register before requesting AV equipment.' : 'Sign in to request and track equipment.'}</p>{error && <div className="auth-error">{error}</div>}<form onSubmit={onSubmit}>{registering && <><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required /></label><div className="modal-fields"><label>Department<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="Film and media" /></label><label>Roll number<input value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} placeholder="AV-2026-001" /></label></div></>}<label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder={role === 'admin' ? 'admin@avroom.local' : 'you@college.edu'} required /></label><label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" minLength="6" required /></label><button className="primary-button full" disabled={busy} type="submit">{busy ? 'Please wait...' : registering ? 'Register user' : role === 'admin' ? 'Login as admin' : 'Login as user'}</button></form>{role === 'student' && <button type="button" className="auth-switch" onClick={() => setMode(registering ? 'login' : 'register')}>{registering ? 'Already registered? Login' : 'New user? Register'}</button>}{role === 'admin' && <small className="demo-hint">Local admin: admin@avroom.local / admin123</small>}</div></main></div>
}

function label(status = '') { return status.charAt(0).toUpperCase() + status.slice(1) }
function statusTone(status) { return { Pending: 'yellow', Approved: 'green', Borrowed: 'green', Returned: 'blue', Rejected: 'red', Overdue: 'red' }[status] || 'yellow' }
function isActiveLoan(status) { return ['Approved', 'Borrowed', 'Overdue'].includes(status) }
function initials(name) { return String(name).split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || 'US' }
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not set' }
function today() { return new Date().toISOString().slice(0, 10) }
function tomorrow() { const value = new Date(); value.setDate(value.getDate() + 1); return value.toISOString().slice(0, 10) }
function navIcon(item) { return { Overview: '#', Bookings: 'B', Equipment: 'E', Borrowers: 'U', Reports: 'R', Settings: 'S' }[item] }

export default App
