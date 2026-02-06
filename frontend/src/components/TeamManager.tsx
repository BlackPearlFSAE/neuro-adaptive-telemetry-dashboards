import React, { useState } from 'react'
import { TeamMember } from '../types/telemetry'

interface TeamManagerProps {
    members: TeamMember[]
    onUpdate: (members: TeamMember[]) => void
}

export const TeamManager: React.FC<TeamManagerProps> = ({ members, onUpdate }) => {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<TeamMember>>({})

    const handleEdit = (member: TeamMember) => {
        setEditingId(member.id)
        setEditForm(member)
    }

    const handleSave = () => {
        if (!editingId) return
        const updatedMembers = members.map(m => m.id === editingId ? { ...m, ...editForm } as TeamMember : m)

        // If updating a driver to Active, ensure others are set to Resting
        if (editForm.status === 'Active' && editForm.role === 'Driver') {
            updatedMembers.forEach(m => {
                if (m.id !== editingId && m.role === 'Driver' && m.status === 'Active') {
                    m.status = 'Resting'
                }
            })
        }

        onUpdate(updatedMembers)
        setEditingId(null)
    }

    const handleCancel = () => {
        setEditingId(null)
        setEditForm({})
    }

    const handleChange = (field: keyof TeamMember, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>TEAM MANAGEMENT</h2>
                <button style={styles.addBtn}>+ ADD MEMBER</button>
            </div>

            <div style={styles.grid}>
                {members.map(member => (
                    <div key={member.id} style={{
                        ...styles.card,
                        borderColor: member.status === 'Active' ? '#00ff88' : 'rgba(255,255,255,0.1)'
                    }}>
                        {editingId === member.id ? (
                            <div style={styles.editForm}>
                                <input
                                    style={styles.input}
                                    value={editForm.name || ''}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Name"
                                />
                                <select
                                    style={styles.select}
                                    value={editForm.role || 'Driver'}
                                    onChange={e => handleChange('role', e.target.value)}
                                >
                                    <option value="Driver">Driver</option>
                                    <option value="Race Engineer">Race Engineer</option>
                                    <option value="Strategist">Strategist</option>
                                </select>
                                <select
                                    style={styles.select}
                                    value={editForm.status || 'Active'}
                                    onChange={e => handleChange('status', e.target.value)}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Resting">Resting</option>
                                    <option value="Simulator">Simulator</option>
                                </select>
                                <div style={styles.actionRow}>
                                    <button style={styles.saveBtn} onClick={handleSave}>SAVE</button>
                                    <button style={styles.cancelBtn} onClick={handleCancel}>CANCEL</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={styles.cardHeader}>
                                    <div style={{ ...styles.avatar, background: member.avatarColor }}>
                                        {member.name.charAt(0)}
                                    </div>
                                    <div style={styles.info}>
                                        <div style={styles.name}>{member.name}</div>
                                        <div style={styles.role}>{member.role}</div>
                                    </div>
                                    <div style={{
                                        ...styles.statusBadge,
                                        color: member.status === 'Active' ? '#00ff88' : '#aaa',
                                        borderColor: member.status === 'Active' ? '#00ff88' : '#555'
                                    }}>
                                        {member.status.toUpperCase()}
                                    </div>
                                </div>

                                <div style={styles.statsGrid}>
                                    <div style={styles.stat}>
                                        <span style={styles.statLabel}>Exp</span>
                                        <span style={styles.statValue}>{member.experience}</span>
                                    </div>
                                    <div style={styles.stat}>
                                        <span style={styles.statLabel}>Races</span>
                                        <span style={styles.statValue}>{member.stats.races}</span>
                                    </div>
                                    {member.role === 'Driver' && (
                                        <div style={styles.stat}>
                                            <span style={styles.statLabel}>Avg Lap</span>
                                            <span style={styles.statValue}>{member.stats.avgLapTime}</span>
                                        </div>
                                    )}
                                </div>

                                <button style={styles.editBtn} onClick={() => handleEdit(member)}>EDIT PROFILE</button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '0 10px',
    },
    title: {
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '2px',
        margin: 0,
    },
    addBtn: {
        background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        color: '#0a1628',
        fontWeight: 700,
        cursor: 'pointer',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        overflowY: 'auto',
        paddingBottom: '20px',
    },
    card: {
        background: 'rgba(13, 33, 55, 0.6)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.2s ease',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    avatar: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'rgba(0,0,0,0.4)',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#fff',
    },
    role: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    statusBadge: {
        fontSize: '0.65rem',
        padding: '2px 8px',
        borderRadius: '10px',
        border: '1px solid',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        background: 'rgba(0,0,0,0.2)',
        padding: '12px',
        borderRadius: '8px',
    },
    stat: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#fff',
    },
    editBtn: {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.6)',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: 600,
        transition: 'background 0.2s',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    input: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px',
        borderRadius: '4px',
        color: '#fff',
    },
    select: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px',
        borderRadius: '4px',
        color: '#fff',
    },
    actionRow: {
        display: 'flex',
        gap: '10px',
    },
    saveBtn: {
        flex: 1,
        background: '#00ff88',
        border: 'none',
        padding: '8px',
        borderRadius: '4px',
        color: '#0a1628',
        fontWeight: 700,
        cursor: 'pointer',
    },
    cancelBtn: {
        flex: 1,
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '8px',
        borderRadius: '4px',
        color: '#fff',
        cursor: 'pointer',
    },
}
