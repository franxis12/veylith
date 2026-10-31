import { useState } from 'react';
import { LIBRARY } from './library';
import { assetUrl } from '../game/assets/loadCharacterAssets';

export function AssetLibrary({ place }: { place: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const items = LIBRARY.filter((item) =>
    `${item.name} ${item.id} ${item.category} ${item.path ?? ''}`
      .toLocaleLowerCase()
      .includes(search),
  );
  const categories = [...new Set(items.map((item) => item.category))];
  return (
    <>
      <label className="asset-search">
        Buscar recursos
        <input
          type="search"
          value={query}
          placeholder="Nombre, familia o archivo…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {items.length === 0 && <p>No hay recursos con ese nombre.</p>}
      {categories.map((category) => (
        <details
          key={category}
          open={
            !!search ||
            [
              'Escenarios ilustrados',
              'Terreno',
              'Recolectables',
              'Gemas',
              'Objetos interactivos',
            ].includes(category)
          }
        >
          <summary>{category}</summary>
          <div className="asset-grid">
            {items
              .filter((item) => item.category === category)
              .map((item) => (
                <button
                  key={item.id}
                  title={item.name}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      'application/x-veylith-asset',
                      item.id,
                    )
                  }
                  onClick={() => place(item.id)}
                >
                  <span
                    className="asset-thumb"
                    style={
                      item.path
                        ? {
                            backgroundImage: `url(${assetUrl(item.path)})`,
                            backgroundSize: item.frames
                              ? `${item.frames * 100}% 100%`
                              : 'contain',
                          }
                        : {}
                    }
                  >
                    {!item.path
                      ? item.type === 'spawn'
                        ? '◎'
                        : item.type === 'label'
                          ? 'T'
                          : '↗'
                      : null}
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
          </div>
        </details>
      ))}
    </>
  );
}
